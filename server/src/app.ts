import express, { type Application } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

app.use(express.json());

export default app;