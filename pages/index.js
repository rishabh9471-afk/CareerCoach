import { useState } from "react";
import Head from "next/head";
import UploadScreen from "../components/UploadScreen";
import ChatScreen from "../components/ChatScreen";

export default function Home() {
  const [phase, setPhase] = useState("upload"); // "upload" | "chat"
  const [firstMessage, setFirstMessage] = useState("");
  const [fileName, setFileName] = useState("");

  function handleStart(message, name) {
    setFirstMessage(message);
    setFileName(name);
    setPhase("chat");
  }

  function handleRestart() {
    setFirstMessage("");
    setFileName("");
    setPhase("upload");
  }

  return (
    <>
      <Head>
        <title>AI Career Coach</title>
        <meta name="description" content="Get clarity on your next career move in one sharp, personalised conversation." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {phase === "upload" && <UploadScreen onStart={handleStart} />}
      {phase === "chat" && (
        <ChatScreen
          firstMessage={firstMessage}
          fileName={fileName}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
