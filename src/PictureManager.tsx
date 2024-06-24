import { getUrl, remove, uploadData } from "aws-amplify/storage";
import { useEffect, useState } from "react";
import { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { Button,  Heading } from "@aws-amplify/ui-react";

type PictureManagerProps = {
  roomId: string;
};

const client = generateClient<Schema>();

// コピー関数の追加
function copyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

// CSVダウンロード関数の追加
function downloadCSV(filename, data) {
  const csvData = data.join("\n");
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    window.open(URL.createObjectURL(blob));
  }
}


export function PictureManager({ roomId }: PictureManagerProps) {
  const [pictures, setPictures] = useState<Schema["Picture"]["type"][]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [haiku, setHaiku] = useState<string>();

  useEffect(() => {
    const sub = client.models.Picture.observeQuery({
      filter: {
        roomId: {
          eq: roomId,
        },
      },
    }).subscribe({
      next: async ({ items }) => {
        setPictures([...items]);
      },
    });

    return () => sub.unsubscribe();
  }, [roomId]);

  useEffect(() => {
    async function fetchUrls() {
      const imageUrls = (
        await Promise.all(
          pictures.map(async (item) => await getUrl({ path: item.path }))
        )
      ).map((item) => item.url.toString());
      setImageUrls(imageUrls);
    }
    fetchUrls();
  }, [pictures]);

  console.log(haiku);

  return (
    <>
{/*
      {imageUrls.length > 0 ? (
        <div className="picture-gallery">
          <Heading level={2}>商品データの分析</Heading>
          <Flex justifyContent={"space-evenly"}>
            {imageUrls.map((url) => (
              <img key={url} className="picture-img" src={url} />
            ))}
          </Flex>
          {haiku && (
            <Heading level={4} margin={"1rem"}>
              {haiku}
            </Heading>
          )}
        </div>
      ) : null}
*/}
    {/*Add----*/}
{imageUrls.length > 0 ? (
  <div className="picture-gallery">
    <Heading level={2}>商品データの分析</Heading>
    <div className="picture-container">
      {imageUrls.map((url, index) => (
        <img key={index} className="picture-img" src={url} />
      ))}
    </div>
    {haiku && (
      <div className="haiku-container">
        <Heading level={4} margin={"1rem"}>
          商品データ
        </Heading>
        <table className="haiku-table">
         <thead>
            <tr>
              <th className="haiku-header">ID</th>
              <th className="haiku-header">種類</th>
              <th className="haiku-header">名称</th>
            </tr>
          </thead>
          <tbody>
            {haiku.split('\n').map((line, index) => (
              <tr key={index}>
                <td className="haiku-cell">{line.split(' ')[0]}</td>
                <td className="haiku-cell">{line.split(' ')[1]}</td>
                <td className="haiku-cell">{line.split(' ').slice(2).join(' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>

              <div className="haiku-buttons">
                <button onClick={() => copyToClipboard(haiku)}>
                  Copy Data
                </button>
                <button
                  onClick={() =>
                    downloadCSV("product_data.csv", haiku.split("\n"))
                  }
                >
                  Download CSV
                </button>
              </div>
      </div>
    )}
  </div>
) : null}
    {/*Add----*/}


      <div className="picture-layout">
        <Button variation="primary" backgroundColor="white" color="black">
          <label htmlFor="picture-uploader">+ 分析画像の選択</label>
        </Button>
        <input
          style={{ display: "none" }}
          type="file"
          accept="image/png"
          id="picture-uploader"
          onInput={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) {
              return;
            }

            const result = await uploadData({
              path: `room/${roomId}/${file.name}`,
              data: file,
            }).result;

            client.models.Picture.create({
              roomId,
              path: result.path,
            });
          }}
        />

        <Button
          variation="primary"
          backgroundColor="white"
          color="black"
          onClick={async () => {
            await Promise.all(
              pictures.map((item) => remove({ path: item.path }))
            );
            await Promise.all(
              pictures.map((item) => client.models.Picture.delete(item))
            );
            setHaiku("");
          }}
        >
          ファイルクリア
        </Button>

        <Button
          variation="primary"
          backgroundColor="white"
          color="black"
          onClick={async () => {
            const { data, errors } = await client.queries.generateHaiku({
              roomId,
            });
            console.log("errors", errors);
            if (data !== null) {
              setHaiku(data);
            }
          }}
        >
          Bedrock分析
        </Button>
      </div>
    </>
  );
}
