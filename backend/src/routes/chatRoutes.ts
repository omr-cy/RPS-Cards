import { Router } from 'express';
import { getChatHistory } from '../controllers/chatController';

const router = Router();

router.get('/history', getChatHistory);

export const chatRoutes = router;
