import { classifyGeminiError, withGeminiRetry } from "../aiProvider.service";

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

    it("returns isQuotaExhausted=true for quota 429", () => {
      const err = new Error("RESOURCE_EXHAUSTED: Quota exceeded");
      const result = classifyGeminiError(err);
      expect(result.isQuotaExhausted).toBe(true);
      expect(result.isRetryable).toBe(false);
      expect(result.isRateLimit).toBe(false);
      expect(result.isServerError).toBe(false);
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

    it("does not retry on permanent errors", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("400 Bad Request: Invalid schema"));
      const promise = withGeminiRetry("testOp", mockFn);
      await expect(promise).rejects.toThrow("400 Bad Request: Invalid schema");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it("does not retry on daily quota exhaustion", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("RESOURCE_EXHAUSTED: Quota exceeded"));
      const promise = withGeminiRetry("testOp", mockFn);
      await expect(promise).rejects.toThrow("RESOURCE_EXHAUSTED: Quota exceeded");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it("retries up to 2 times (3 total attempts) with exponential backoff on 503 errors and then throws", async () => {
      const error = new Error("503 This model is currently experiencing high demand.");
      const mockFn = jest.fn().mockRejectedValue(error);
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

      await expect(promise).rejects.toThrow("503 This model is currently experiencing high demand.");
      expect(mockFn).toHaveBeenCalledTimes(3);
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
});
