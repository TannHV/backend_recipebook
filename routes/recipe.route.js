import express from 'express';
import recipeController from '../controllers/recipe.controller.js';
import auth from '../middlewares/auth.js';
import roleCheck from '../middlewares/roleCheck.js';
import { uploadThumbnailImage } from "../middlewares/uploadImage.js";

import {
    validateCreateRecipe,
    validateUpdateRecipe,
    validateComment,
    validateRating,
    validateRecipeListQuery,
    validateIdParam,
    validateTwoIds,
} from "../middlewares/validation.js";
import { sanitizeRecipeFields, sanitizeCommentField } from '../middlewares/xss.js';

const router = express.Router();

// public
router.get('/', validateRecipeListQuery, recipeController.list);
router.get('/:id', validateIdParam("id"), recipeController.getById);

// private (author)
router.post('/', auth, uploadThumbnailImage.single('thumbnail'), validateCreateRecipe, sanitizeRecipeFields(['title', 'summary', 'content']), recipeController.create);
router.put('/:id', auth, validateIdParam("id"), uploadThumbnailImage.single('thumbnail'), validateUpdateRecipe, recipeController.update);
router.delete('/:id', auth, validateIdParam("id"), recipeController.remove);

// interactions
router.post('/:id/like', auth, validateIdParam("id"), recipeController.toggleLike);
router.post('/:id/rate', auth, validateIdParam("id"), validateRating, recipeController.rate);
router.put('/:id/rating', auth, validateIdParam('id'), validateRating, recipeController.updateRate)
router.delete('/:id/rating', auth, validateIdParam("id"), recipeController.userDeleteRating);
router.post('/:id/comments', auth, validateIdParam("id"), validateComment, sanitizeCommentField('content'), recipeController.addComment);
router.delete('/:id/comments/:commentId', auth, validateTwoIds("id", "commentId"), recipeController.userDeleteComment);

// admin moderation
router.patch('/:id/hide', auth, roleCheck('admin'), validateIdParam("id"), recipeController.hide);
router.patch('/:id/unhide', auth, roleCheck('admin'), validateIdParam("id"), recipeController.unhide);
router.delete('/:id/rating/:userId', auth, roleCheck('admin'), validateTwoIds("id", "userId"), recipeController.deleteUserRating);
router.delete('/:id/comments/:commentId/admin', auth, roleCheck('admin'), validateTwoIds("id", "commentId"), recipeController.deleteComment);

export default router;
