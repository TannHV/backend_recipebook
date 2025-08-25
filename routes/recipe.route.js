import express from 'express';
import recipeController from '../controllers/recipe.controller.js';
import auth from '../middlewares/auth.js';
import roleCheck from '../middlewares/roleCheck.js';
import { uploadThumbnailImage } from "../middlewares/uploadImage.js";


const router = express.Router();

// public
router.get('/', recipeController.list);
router.get('/:id', recipeController.getById);

// private (author)
router.post('/', auth, uploadThumbnailImage.single('thumbnail'), recipeController.create);
router.put('/:id', auth, uploadThumbnailImage.single('thumbnail'), recipeController.update);
router.delete('/:id', auth, recipeController.remove);

// interactions
router.post('/:id/like', auth, recipeController.toggleLike);
router.post('/:id/rate', auth, recipeController.rate);
router.delete('/:id/rating', auth, recipeController.userDeleteRating);
router.post('/:id/comments', auth, recipeController.addComment);
router.delete('/:id/comments/:commentId', auth, recipeController.userDeleteComment);

// admin moderation
router.patch('/:id/hide', auth, roleCheck('admin'), recipeController.hide);
router.patch('/:id/unhide', auth, roleCheck('admin'), recipeController.unhide);
router.delete('/:id/rating/:userId', auth, roleCheck('admin'), recipeController.deleteUserRating);
router.delete('/:id/comments/:commentId/admin', auth, roleCheck('admin'), recipeController.deleteComment);

export default router;
