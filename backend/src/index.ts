import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import { send24hrReminder, sendBroadcastEmail, scheduleAttendanceRequest } from "./inngest/functions";
import emailRoutes from './routes/email';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Inngest Endpoint
app.use(
    "/api/inngest",
    serve({
        client: inngest,
        functions: [
            send24hrReminder,

            sendBroadcastEmail,
            scheduleAttendanceRequest
        ],
    })
);

// Email Routes
app.use('/api/email', emailRoutes);

app.get('/', (req, res) => {
    res.send('AppointFlow Backend is running');
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
