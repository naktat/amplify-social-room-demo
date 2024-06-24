import { S3Client, ListObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Schema } from "../../data/resource";
import { env } from '$amplify/env/generateHaiku'
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandInput } from "@aws-sdk/client-bedrock-runtime";

const s3Client = new S3Client()
const bedrockClient = new BedrockRuntimeClient({
  region: "us-east-1"
})

export const handler: Schema["generateHaiku"]["functionHandler"] = async (context) => {
  const fileNames = await s3Client.send(new ListObjectsCommand({
    Bucket: env.GEN_2_MULTI_CURSOR_DEMO_APP_BUCKET_NAME,
    Prefix: 'room/' + context.arguments.roomId + '/'
  }))

  const files = []

  for (const key of fileNames.Contents?.map(item => item.Key) ?? []) {
    const file = await s3Client.send(new GetObjectCommand({
      Bucket: env.GEN_2_MULTI_CURSOR_DEMO_APP_BUCKET_NAME,
      Key: key
    }))

    files.push(await file.Body?.transformToString('base64'))
  }

  const input: InvokeModelCommandInput = {
    modelId: process.env.MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      system:
        // "あなたは俳句を作る専門家です。あなたは何からでも俳句を作ることができるので、俳句だけで答えます。文と文の間は必ず改行してください。次の画像をもとに俳句を作ってください：",
        "あなたはデータ分析担当です。表形式の画像が送られてくるため、正確に文字情報を読み取ってください。データとデータの間は必ずスペースを開けて、改行してください。次の画像をもとにデータを解析結果を表示してください：",
      messages: [
        {
          role: "user",
          content: [...files.map(b64 => ({
            type: 'image',
            source: {
              type: 'base64',
              data: b64,
              media_type: 'image/png'
            }
          })), {
            type: 'text',
            text: '解析結果は、上記のすべてのイメージの組み合わせに基づいて、正確に作成します。'
          }],
        },
      ],
      max_tokens: 5000,
      temperature: 0.5,
    }),
  };

  const result = await bedrockClient.send(new InvokeModelCommand(input))

  return JSON.parse(Buffer.from(result.body).toString()).content[0].text
}



// files.map(file => file.Body?.transformToString('base64'))

// return JSON.stringify(files)