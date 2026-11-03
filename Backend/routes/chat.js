import express from "express"
import Thread from "../models/Thread.js";
import getOpenAiAPIResponse from "../utils/openai.js";
const router= express.Router();


//test
router.post("/test", async(req, res)=>{
    try{
        const thread= new Thread({
            threadId:"imiss you",
            title:"Testing new thread3"

        });

        const response= await thread.save();
        res.send(response);
    }
    catch(error){
        console.log(error);
        res.status(500).json({error: "Failed to save in DB"})

    }
    
});

//to get all threads and sort in descending orderupdatedat 
router.get("/thread", async(req, res)=>{
    try{
        //descending order of updatedat
        const threads= await Thread.find({}).sort({updatedAt: -1});
        res.json(threads);
    }
    catch(error){
        console.log(error);
        res.status(500).json({error: "Failed to fetch threads"});

    }
})

//sened the information of particular thread on threadid

router.get("/thread/:threadId", async(req, res)=>{
    const {threadId}= req.params

    try{
        const thread= await Thread.findOne({threadId});

        if(!thread){
            res.status(404).json({error: "Thread not found"})

        }
        res.json(thread.messages);
    }
    catch(error){
        console.log(error);
        res.status(500).json({error: "Failed to fetch chat"});
    }
})
router.delete("/thread/:threadId", async(req, res)=>{
    const {threadId}= req.params;
    try{
        const deletedThread= await Thread.findOneAndDelete({threadId});
        if(!deletedThread){
            res.status(404).json({error: "Thread not found "})
        }
        res.status(200).json({success: "Thread deleted suceessfully"});
    }
    catch(error){
        console.log(error);
        res.status(500).json({error: "Failed to delete the thread"});
        
    }

})
router.post("/chat", async(req, res)=>{
    const {threadId, message}= req.body;
    if(!threadId || !message){
        res.status(400).json({error: "missing required fields"});
    
    }
    try{
        let thread= await Thread.findOne({threadId});
        if(!thread){
            //create new thread
            thread= new Thread({
                threadId,
                title:message,
                messages:[{role: "user", content: message}]
            });
        }
        else{
            thread.messages.push({role: "user", content: message});
        }
        const assistantReply= await getOpenAiAPIResponse(message);
        thread.messages.push({role: "assistant", content: assistantReply});
        thread.updatedAt= new Date();
        await thread.save();
        res.json({reply: assistantReply });
    }
    catch(error){
        console.log(error);
        res.status(500).json({error: "Something went wrong"});
    }
})


export default router;