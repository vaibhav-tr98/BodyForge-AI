import { Request, Response } from "express";
import mongoose from "mongoose";
import Workout, { IExercise, IWorkout } from "../models/Workout";
import logger from "../utils/logger";

type WorkoutField = "name" | "description" | "exercises";
type WorkoutUpdate = Partial<Pick<IWorkout, WorkoutField>>;

const WORKOUT_FIELDS: readonly WorkoutField[] = ["name", "description", "exercises"];
const EXERCISE_FIELDS = ["name", "sets", "reps", "weight"] as const;

const toWorkoutResponse = (workout: IWorkout) => ({
  id: workout._id.toString(),
  name: workout.name,
  ...(workout.description !== undefined ? { description: workout.description } : {}),
  exercises: workout.exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    ...(exercise.weight !== undefined ? { weight: exercise.weight } : {}),
  })),
  createdAt: workout.createdAt,
  updatedAt: workout.updatedAt,
});

const getAuthenticatedUserId = (req: Pick<Request, "authenticatedUserId">, res: Response): string | undefined => {
  if (!req.authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }

  return req.authenticatedUserId;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const hasOnlyAllowedFields = (body: Record<string, unknown>, allowedFields: readonly string[]): boolean =>
  Object.keys(body).every((field) => allowedFields.includes(field));

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const parseName = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0 || trimmedValue.length > 100) {
    return undefined;
  }

  return trimmedValue;
};

const parseDescription = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value.trim().length > 500) {
    return undefined;
  }

  return value.trim();
};

const parseExercises = (value: unknown): IExercise[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const exercises: IExercise[] = [];

  for (const exercise of value) {
    if (!isPlainObject(exercise) || !hasOnlyAllowedFields(exercise, EXERCISE_FIELDS)) {
      return undefined;
    }

    const name = parseName(exercise.name);
    const sets = exercise.sets;
    const reps = exercise.reps;
    if (!name || !isPositiveInteger(sets)) {
      return undefined;
    }

    if (!isPositiveInteger(reps)) {
      return undefined;
    }

    let weight: number | undefined;
    if ("weight" in exercise) {
      if (!isFiniteNumber(exercise.weight) || exercise.weight < 0) {
        return undefined;
      }
      weight = exercise.weight;
    }

    exercises.push({
      name,
      sets,
      reps,
      ...(weight !== undefined ? { weight } : {}),
    });
  }

  return exercises;
};

const isValidWorkoutId = (workoutId: string): boolean => mongoose.isObjectIdOrHexString(workoutId);

export const createWorkout = async (
  req: Request<unknown, unknown, unknown>,
  res: Response
): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  if (!isPlainObject(req.body) || !hasOnlyAllowedFields(req.body, WORKOUT_FIELDS)) {
    res.status(400).json({ success: false, message: "A valid workout is required" });
    return;
  }

  const name = parseName(req.body.name);
  if (!name) {
    res.status(400).json({ success: false, message: "Workout name must be between 1 and 100 characters" });
    return;
  }

  if (!("exercises" in req.body)) {
    res.status(400).json({ success: false, message: "Exercises must be an array" });
    return;
  }

  const exercises = parseExercises(req.body.exercises);
  if (!exercises) {
    res.status(400).json({ success: false, message: "Exercises must contain valid exercise entries" });
    return;
  }

  let description: string | undefined;
  if ("description" in req.body) {
    description = parseDescription(req.body.description);
    if (description === undefined) {
      res.status(400).json({ success: false, message: "Description must be a string of 500 characters or fewer" });
      return;
    }
  }

  try {
    const workout = await Workout.create({ user: userId, name, description, exercises });

    res.status(201).json({
      success: true,
      message: "Workout created successfully",
      data: { workout: toWorkoutResponse(workout) },
    });
  } catch (error) {
    logger.error("Create workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to create workout" });
  }
};

export const getWorkouts = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const workouts = await Workout.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { workouts: workouts.map(toWorkoutResponse) },
    });
  } catch (error) {
    logger.error("Get workouts failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve workouts" });
  }
};

export const getWorkoutById = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  if (!isValidWorkoutId(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid workout ID" });
    return;
  }

  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: userId });
    if (!workout) {
      res.status(404).json({ success: false, message: "Workout not found" });
      return;
    }

    res.status(200).json({ success: true, data: { workout: toWorkoutResponse(workout) } });
  } catch (error) {
    logger.error("Get workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve workout" });
  }
};

export const updateWorkout = async (
  req: Request<{ id: string }, unknown, unknown>,
  res: Response
): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  if (!isValidWorkoutId(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid workout ID" });
    return;
  }

  if (!isPlainObject(req.body) || !hasOnlyAllowedFields(req.body, WORKOUT_FIELDS) || Object.keys(req.body).length === 0) {
    res.status(400).json({ success: false, message: "A valid workout update is required" });
    return;
  }

  const workoutUpdate: WorkoutUpdate = {};

  if ("name" in req.body) {
    const name = parseName(req.body.name);
    if (!name) {
      res.status(400).json({ success: false, message: "Workout name must be between 1 and 100 characters" });
      return;
    }
    workoutUpdate.name = name;
  }

  if ("description" in req.body) {
    const description = parseDescription(req.body.description);
    if (description === undefined) {
      res.status(400).json({ success: false, message: "Description must be a string of 500 characters or fewer" });
      return;
    }
    workoutUpdate.description = description;
  }

  if ("exercises" in req.body) {
    const exercises = parseExercises(req.body.exercises);
    if (!exercises) {
      res.status(400).json({ success: false, message: "Exercises must contain valid exercise entries" });
      return;
    }
    workoutUpdate.exercises = exercises;
  }

  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      workoutUpdate,
      { new: true, runValidators: true }
    );

    if (!workout) {
      res.status(404).json({ success: false, message: "Workout not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Workout updated successfully",
      data: { workout: toWorkoutResponse(workout) },
    });
  } catch (error) {
    logger.error("Update workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to update workout" });
  }
};

export const deleteWorkout = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  if (!isValidWorkoutId(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid workout ID" });
    return;
  }

  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!workout) {
      res.status(404).json({ success: false, message: "Workout not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Workout deleted successfully" });
  } catch (error) {
    logger.error("Delete workout failed:", error);
    res.status(500).json({ success: false, message: "Unable to delete workout" });
  }
};
