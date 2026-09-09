import { classifyGeminiError, withGeminiRetry, withSingleFlight } from "../aiProvider.service";

describe("AIProvider Service Tests", () => {
  describe("classifyGeminiError", () => {
    it("returns isServerError=true for 503 high demand", () => {
      const err = new Error("503 This model is currently experiencing high demand.");
      const result = classifyGeminiError(err);
      expect(result.isServerError).toBe(true);
      expect(result.isRetryable).toBe(true);
      expect(result.isQuotaExhausted).toBe(false);
      expect(result.isRateLimit).toBe(false);
    });

    it("returns isRateLimit=true for temporary RPM 429", () => {
      const err = new Error("Error 429: GenerateRequestsPerMinutePerProjectPerModel-FreeTier limit exceeded");
      const result = classifyGeminiError(err);
      expect(result.isRateLimit).toBe(true);
      expect(result.isRetryable).toBe(true);
      expect(result.isQuotaExhausted).toBe(false);
      expect(result.isServerError).toBe(false);
    });

    it("returns isQuotaExhausted=true for explicit quota exhaustion", () => {
      const err = new Error("RESOURCE_EXHAUSTED: explicit quota exhaustion reached");
      const result = classifyGeminiError(err);
      expect(result.isQuotaExhausted).toBe(true);
      expect(result.isRetryable).toBe(false);
      expect(result.isRateLimit).toBe(false);
      expect(result.isServerError).toBe(false);
    });

    it("returns isQuotaExhausted=true for explicit generate_content_free_tier_requests", () => {
      const err = new Error("429: generate_content_free_tier_requests quota exhausted");
      const result = classifyGeminiError(err);
      expect(result.isQuotaExhausted).toBe(true);
      expect(result.isRetryable).toBe(false);
      expect(result.isRateLimit).toBe(false);
    });

    it("extracts Gemini retryDelay: 35s", () => {
      const err = new Error("Error 429: Rate limit. retryDelay: 35s");
      const result = classifyGeminiError(err);
      expect(result.retryAfterMs).toBe(35000);
      expect(result.isRetryable).toBe(true);
    });

    it("returns all false for permanent 400 errors", () => {
      const err = new Error("400 Bad Request: Invalid schema");
      const result = classifyGeminiError(err);
      expect(result.isRetryable).toBe(false);
      expect(result.isQuotaExhausted).toBe(false);
      expect(result.isRateLimit).toBe(false);
      expect(result.isServerError).toBe(false);
    });
  });

  describe("withGeminiRetry", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout");
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it("does not retry on permanent errors and preserves original error", async () => {
      const originalError = new Error("400 Bad Request: Invalid schema");
      const mockFn = jest.fn().mockRejectedValue(originalError);
      const promise = withGeminiRetry("testOp", mockFn);
      await expect(promise).rejects.toBe(originalError);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it("does not retry on daily quota exhaustion and preserves original error", async () => {
      const originalError = new Error("RESOURCE_EXHAUSTED: explicit quota exhaustion reached");
      const mockFn = jest.fn().mockRejectedValue(originalError);
      const promise = withGeminiRetry("testOp", mockFn);
      await expect(promise).rejects.toBe(originalError);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it("retries up to 2 times (3 total attempts) with exponential backoff on 503 errors and then throws original error", async () => {
      const originalError = new Error("503 This model is currently experiencing high demand.");
      const mockFn = jest.fn().mockRejectedValue(originalError);
      const promise = withGeminiRetry("testOp", mockFn);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);

      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      await expect(promise).rejects.toBe(originalError);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("uses provider-supplied retry delay when available", async () => {
      const error = new Error("Error 429: GenerateRequestsPerMinutePerProjectPerModel-FreeTier retryDelay: 35s");
      const mockFn = jest.fn().mockRejectedValue(error);
      const promise = withGeminiRetry("testOp", mockFn);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 35000);

      jest.advanceTimersByTime(35000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 35000);
    });

    it("succeeds on the second attempt after a temporary RPM 429", async () => {
      const error = new Error("Error 429: GenerateRequestsPerMinutePerProjectPerModel-FreeTier");
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");
      const promise = withGeminiRetry("testOp", mockFn);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      jest.advanceTimersByTime(5000);
      
      const result = await promise;
      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("withSingleFlight", () => {
    it("single-flight concurrent identical requests -> exactly ONE Gemini call", async () => {
      let callCount = 0;
      const mockFn = async () => {
        callCount++;
        await new Promise(res => setImmediate(res));
        return "success";
      };

      const p1 = withSingleFlight("hash1", mockFn);
      const p2 = withSingleFlight("hash1", mockFn);
      const p3 = withSingleFlight("hash1", mockFn);

      const results = await Promise.all([p1, p2, p3]);

      expect(results).toEqual(["success", "success", "success"]);
      expect(callCount).toBe(1);
    });

    it("single-flight different users/input hashes -> independent calls", async () => {
      let callCount = 0;
      const mockFn = async () => {
        callCount++;
        await new Promise(res => setImmediate(res));
        return "success";
      };

      const p1 = withSingleFlight("hash1", mockFn);
      const p2 = withSingleFlight("hash2", mockFn);
      
      const results = await Promise.all([p1, p2]);

      expect(results).toEqual(["success", "success"]);
      expect(callCount).toBe(2);
    });

    it("failed single-flight request is removed so a later request can retry", async () => {
      let callCount = 0;
      const mockFn = async () => {
        callCount++;
        if (callCount === 1) throw new Error("Temp Error");
        return "success";
      };

      await expect(withSingleFlight("hash1", mockFn)).rejects.toThrow("Temp Error");
      expect(callCount).toBe(1);

      const result = await withSingleFlight("hash1", mockFn);
      expect(result).toBe("success");
      expect(callCount).toBe(2);
    });
  });
});
