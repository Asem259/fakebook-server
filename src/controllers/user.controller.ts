import { NextFunction, Request, Response } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';

import { HttpError } from '../utils/HttpError';
import {
  NewUserSchema,
  LoginUserSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../schemas/user.schema';
import mailService, { EmailTemplate } from '../services/mail.service';
import userService from '../services/user.service';

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const newUserData = NewUserSchema.parse(req.body);

    const newUser = await userService.createUser(newUserData);
    const jwtToken = userService.generateToken(newUser.id);
    const url = userService.generateVerificationUrl(newUser.id);

    await mailService.sendEmail(
      EmailTemplate.ACCOUNT_VERIFICATION,
      newUser.email,
      url
    );

    res.status(200).send({ ...newUser, jwtToken });
  } catch (err) {
    next(err);
  }
};

export const signin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credentials = LoginUserSchema.parse(req.body);

    const user = await userService.login(credentials);
    const jwtToken = userService.generateToken(user.id);

    res.status(200).send({ ...user, jwtToken });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);

    const url = await userService.generateResetUrl(email);

    await mailService.sendEmail(EmailTemplate.PASSWORD_RESET, email, url);
    res.status(200).send({ message: 'Reset link sent to your Email' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);

    await userService.updatePassword({ token, newPassword });

    res.status(200).send({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof TokenExpiredError)
      next(new HttpError(410, 'Reset password link is expired'));
    else next(err);
  }
};
