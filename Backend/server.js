//pasted from https://www.npmjs.com/package/openai we have 2 ways to use model 
//through npm package and through api call. 
// This is way for npm package
//To use choose model name and give input then run node server.js

//by npm package
// import OpenAI from 'openai';
// import 'dotenv/config';

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
// });

// const response = await client.responses.create({
//   model: 'gpt-4o-mini',//for choosing the model
//   input: 'differences between javascipt and java',//for prompt
// });

// console.log(response.output_text);

//by api call
import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes  from "./routes/chat.js";

const app= express();
const PORT= 8080;
//middlewares
app.use(express.json());//for parse our incoming req
app.use(cors());
app.use("/api", chatRoutes);
app.listen(PORT, ()=>{
    console.log(`server running on ${PORT}`);
    connectDB();
});
const connectDB = async()=>{
    try{
        console.log("Mongo URL:", process.env.MONGODB_URL);
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Succesfully Connected with Database");
    }
    catch(error){
        console.log("Failed to connect with DB ", error);
    }
}

//api call
// app.post("/text", async (req, res) =>{
//     const options={
//         method:"POST",
//         headers:{
//             "Content-Type": "application/json",
//             "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
//         },
//         body:JSON.stringify({
//             model: "gpt-4o-mini",
//             messages:[{
//                  role: "user",
//                  content: req.body.message
//             }]
//         })
//     };
//     try {
//         const response= await fetch("https://api.openai.com/v1/chat/completions",options);
//         const data= await response.json();
//         console.log(data.choices[0].message.content);//to print the reply only 
//         res.send(data.choices[0].message.content);//send this reply to frontend

//     } 
//     catch (error) {
//         console.log(error);
//     }
// });









//every time open the project go to cd .backend then node server.js
//To stop a running command/process: Use Control + C (^C).
//always start server when u make changes