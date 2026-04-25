import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = Router();

router.get('/:id', getProfile);
router.post('/:id', updateProfile);

export const profileRoutes = router;
