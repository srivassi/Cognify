// Netlify serverless function for PDF processing
// This is a placeholder for the PDF processing endpoint

const pdfParse = require("pdf-parse");

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const fileData = event.body;

    // Convert base64 to buffer if needed
    let buffer;
    if (typeof fileData === "string") {
      buffer = Buffer.from(fileData, "base64");
    } else {
      buffer = fileData;
    }

    const data = await pdfParse(buffer);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        status: "success",
        text: data.text,
        pages: data.numpages,
      }),
    };
  } catch (error) {
    console.error("Error in process-pdf function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        status: "error",
      }),
    };
  }
};
