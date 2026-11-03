import "dotenv/config";

//this will return the response which was given by open ai using our message
const getOpenAiAPIResponse = async(message)=>{
     const options={
        method:"POST",
        headers:{
            "Content-Type": "application/json",
            "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
        },
        body:JSON.stringify({
            model: "gpt-4o-mini",
            messages:[{
                 role: "user",
                 content: message
            }]
        })
    };
    try {
        const response= await fetch("https://api.openai.com/v1/chat/completions",options);
        const data= await response.json();
        console.log(data.choices[0].message.content);//to print the reply only 
        return (data.choices[0].message.content);//send this reply to frontend

    } 
    catch (error) {
        console.log(error);
    }

}
export default getOpenAiAPIResponse;