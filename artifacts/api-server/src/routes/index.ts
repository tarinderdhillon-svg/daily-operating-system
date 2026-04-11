import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import calendarRouter from "./calendar";
import briefingRouter from "./briefing";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tasks", tasksRouter);
router.use("/calendar", calendarRouter);
router.use("/briefing", briefingRouter);
router.use("/chat", chatRouter);

export default router;
