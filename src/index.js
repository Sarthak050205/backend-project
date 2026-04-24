import dns from 'dns';
import {app} from './app.js';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import 'dotenv/config';
import connectDB from "./database/index.js";

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
});

































// import 'dotenv/config';
// import express from "express";
// import mongoose from "mongoose";

// const app = express();

// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGO_URI}/videotube`, {
//             authSource: "admin",
//             tls: true
//         });
//         console.log("MongoDB connected!");
        
//         app.on("error", (error) => {
//             console.error(error);
//             throw error;
//         });

//         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`);
//         });

//     } catch (error) {
//         console.error(error);
//         process.exit(1);
//     }
// })();