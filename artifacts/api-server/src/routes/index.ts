import { Router, type IRouter } from "express";
import healthRouter from "./health";
import extractRouter from "./extract";
import farmersRouter from "./farmers";
import transliterateRouter from "./transliterate";
import schemesRouter from "./schemes";
import authRouter from "./auth";
import grievancesRouter from "./grievances";
import notificationsRouter from "./notifications";
import insuranceSubsidiesRouter from "./insurance-subsidies";
import applicationsRouter from "./applications";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(extractRouter);
router.use(farmersRouter);
router.use(transliterateRouter);
router.use(schemesRouter);
router.use(grievancesRouter);
router.use(notificationsRouter);
router.use(insuranceSubsidiesRouter);
router.use(applicationsRouter);
router.use(aiRouter);

export default router;
