// Netlify serverless function for scoring quiz answers
// This replaces the FastAPI backend for Netlify deployment

const { ChatGoogleGenerativeAI } = require("langchain/chat_models/google_vertexai");
const { HumanMessage } = require("langchain/schema");

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { question, correct_answer, player1_answer, player2_answer } =
      JSON.parse(event.body);

    if (!question || !correct_answer || !player1_answer || !player2_answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "models/gemini-2.5-flash",
      googleApiKey: process.env.GEMINI_API_KEY,
    });

    // Score player 1 answer
    const player1Prompt = `
Rate how correct this answer is to the question on a scale of 0-100.
Question: ${question}
Correct Answer: ${correct_answer}
Student's Answer: ${player1_answer}

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "analysis": [
    {"text": "<key point>", "type": "correct|incorrect"}
  ]
}
`;

    // Score player 2 answer
    const player2Prompt = `
Rate how correct this answer is to the question on a scale of 0-100.
Question: ${question}
Correct Answer: ${correct_answer}
Student's Answer: ${player2_answer}

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "analysis": [
    {"text": "<key point>", "type": "correct|incorrect"}
  ]
}
`;

    const [player1Response, player2Response] = await Promise.all([
      llm.call([new HumanMessage(player1Prompt)]),
      llm.call([new HumanMessage(player2Prompt)]),
    ]);

    // Parse responses
    const player1Text = player1Response.content;
    const player2Text = player2Response.content;

    const player1Match = player1Text.match(/\{[\s\S]*\}/);
    const player2Match = player2Text.match(/\{[\s\S]*\}/);

    if (!player1Match || !player2Match) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to parse AI response",
          status: "error",
        }),
      };
    }

    const player1Result = JSON.parse(player1Match[0]);
    const player2Result = JSON.parse(player2Match[0]);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        status: "success",
        player1_score: player1Result.score,
        player2_score: player2Result.score,
        player1_analysis: player1Result.analysis,
        player2_analysis: player2Result.analysis,
      }),
    };
  } catch (error) {
    console.error("Error in score-answers function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        status: "error",
      }),
    };
  }
};
