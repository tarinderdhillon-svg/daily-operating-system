import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import calendarRouter from "./calendar";
import briefingRouter from "./briefing";
import chatRouter from "./chat";
import transcribeRouter from "./transcribe";
import learningRouter from "./learning";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tasks", tasksRouter);
router.use("/calendar", calendarRouter);
router.use("/briefing", briefingRouter);
router.use("/chat", chatRouter);
router.use("/transcribe", transcribeRouter);
router.use("/learning", learningRouter);

export default router;
