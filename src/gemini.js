import { GoogleGenerativeAI } from "@google/generative-ai"
import { useInsertionEffect } from "react"

const geminiApiKey = 'AIzaSyCeRYTPVzsvGoedl_9vGrMmm9nMMtap8cA'

const genAI = new GoogleGenerativeAI(geminiApiKey)

const generationConfig = {
    temperature: 1,
    topP: .95,
    topK: 64,
    response_mime_type: 'application/json'
}

const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig
})

const mainPrompt = 'Response to the following text that starts after "GEMINI_QUERY ->" and only that.';

export const sendQueryToGemini = async(userText) => {
    const prompt = `${mainPrompt} GEMINI_QUERY -> ${userText}`;
    try{
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        const value = JSON.parse(text);
        return value.response;
    }catch(err){
        console.log("Some Error has occured", err);

    }
}