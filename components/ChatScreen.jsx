import { NextSeo } from "next-seo";
import {
  ArrowLeftIcon,
  EmojiHappyIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
} from "@heroicons/react/outline";
import { Picker } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import Fade from "react-reveal/Fade";
import { toast } from "react-toastify";
import TimeAgo from "timeago-react";
import { db, storage } from "../firebase";
import useComponentVisible from "../hooks/useComponentVisible";
import getRecipientEmail from "../utils/getRecipientEmail";
import Message from "./Message";

const ChatScreen = ({ chat, messages }) => {
  const user = window?.Clerk?.user;
  const router = useRouter();
  const endOfMessagesRef = useRef(null);
  const [input, setInput] = useState("");
  const focusRef = useRef();
  const [imageToPost, setImageToPost] = useState(null);
  const { ref, isComponentVisible, setIsComponentVisible } =
    useComponentVisible();
  const [hearing, setHearing] = useState(false);

  const SpeechRecognition =
    window?.SpeechRecognition || window?.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  var final_transcript = "";
  recognition.interimResults = true;

  const [messagesSnapshot] = useCollection(
    db
      .collection("chats")
      .doc(router.query.id)
      .collection("messages")
      .orderBy("timestamp", "asc")
  );
  const userLoggedIn = window.Clerk.user.primaryEmailAddress.emailAddress;

  const [recipientSnapshot] = useCollection(
    db
      .collection("users")
      .where("email", "==", getRecipientEmail(chat.users, userLoggedIn))
  );
  const filepickerRef = useRef(null);

  const recipient = recipientSnapshot?.docs?.[0]?.data();
  const addEmoji = (e) => {
    let sym = e.unified.split("-");
    let codesArray = [];
    sym.forEach((el) => codesArray.push("0x" + el));
    let emoji = String.fromCodePoint(...codesArray);
    setInput(input + emoji);
    setIsComponentVisible(false);
    focusRef.current.focus();
  };

  const showMessages = () => {
    if (messagesSnapshot) {
      return messagesSnapshot.docs.map((message) => (
        <div key={message.id}>
          {message.data().image ? (
            <div
              className={`
              w-[340px] h-auto flex p-2
              rounded-xl justify-center items-center
               ${
                 message.data().user === userLoggedIn
                   ? "ml-auto bg-indigo-900"
                   : "bg-blue-900"
               }
              `}
            >
              <div className="w-80 h-80 relative rounded-xl">
                <Image
                  objectFit="contain"
                  layout="fill"
                  alt={message.data().user}
                  className="w-80 rounded-xl object-contain"
                  src={message.data().image}
                />
              </div>
            </div>
          ) : (
            <></>
          )}
          <Message
            key={message.id}
            creatorEmail={message.data().user}
            message={{
              ...message.data(),
              timestamp: message.data().timestamp?.toDate().getTime(),
            }}
            id={message.id}
          />
        </div>
      ));
    } else {
      return JSON.parse(messages).map((message) => (
        <Message
          key={message.id}
          creatorEmail={message.user}
          message={message}
          id={message.id}
        />
      ));
    }
  };

  const textToSpeech = () => {
    function onResult(event) {
      var interim_transcript = "";
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
          setInput(final_transcript);
        } else {
          interim_transcript += event.results[i][0].transcript;
          setInput(interim_transcript);
        }
      }
    }

    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      // speech recognition API supported

      recognition.start();
      setInput("");

      recognition.addEventListener("start", () => {
        setHearing(true);
      });

      recognition.addEventListener("result", onResult);

      recognition.addEventListener("end", () => {
        setHearing(false);
        focusRef.current.focus();
      });

      recognition.addEventListener("error", function (event) {
        setHearing(false);
        alert(event.error);
      });
    } else {
      alert("Your browser does not support speech recognition");
    }
  };

  const ScrollToBottom = () => {
    endOfMessagesRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!input || input[0] === " ") return toast.error("Please add a text");

    db.collection("users")
      .doc(window.Clerk.user.primaryEmailAddress.emailAddress)
      .set(
        {
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    db.collection("chats")
      .doc(router.query.id)
      .collection("messages")
      .add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        message: input,
        user: user.primaryEmailAddress.emailAddress,
        photoURL: user.profileImageUrl,
        edited: false,
      })
      .then((doc) => {
        if (imageToPost) {
          const uploadTask = storage
            .ref(`images/${doc.id}`)
            .putString(imageToPost, "data_url");

          removeImage();

          uploadTask.on(
            "state_changed",
            null,
            (error) => {
              toast.error(error);
            },
            () => {
              storage
                .ref("images")
                .child(doc.id)
                .getDownloadURL()
                .then((url) => {
                  db.collection("chats")
                    .doc(router.query.id)
                    .collection("messages")
                    .doc(doc.id)
                    .set(
                      {
                        image: url,
                      },
                      { merge: true }
                    );
                });
            }
          );
        }
      });

    setInput("");

    ScrollToBottom();
  };

  const addImageToPost = (e) => {
    const reader = new FileReader();
    if (e.target.files[0]) {
      reader.readAsDataURL(e.target.files[0]);
    }

    reader.onload = (readerEvent) => {
      setImageToPost(readerEvent.target.result);
    };
  };

  const removeImage = () => {
    setImageToPost(null);
  };

  useEffect(() => {
    ScrollToBottom();
  });

  const recipientEmail = getRecipientEmail(chat.users, user);
  return (
    <Fade right>
      {recipient?.name ? (
        <NextSeo title={`Chat with ${recipient?.name}`} />
      ) : (
        <NextSeo title={`Chat with ${recipient?.firstName}`} />
      )}
      <div className="flex flex-col bg-[#3736AA] h-full min-w-full">
        <div className="sticky rounded-t-xl bg-[#3736AA] z-30 top-0 flex p-4 h-20 items-center">
          <ArrowLeftIcon
            onClick={() => router.push("/")}
            className="md:!hidden focus:outline-none cursor-pointer h-6 w-6 text-gray-50 mr-2"
          />
          {recipient ? (
            <Image
              width={56}
              height={56}
              className="z-0 m-1 mr-4 rounded-full"
              alt={recipient?.name}
              src={recipient?.photoURL}
            />
          ) : (
            <p className="z-0 flex items-center justify-center text-xl text-center capitalize bg-gray-300 rounded-full w-14 h-14">
              {recipientEmail[0]}
            </p>
          )}

          <div className="flex-1 ml-4">
            <h3 className="mb-1 text-white">
              {recipient?.name ? (
                <p>{recipient?.name}</p>
              ) : (
                <p>{recipient?.firstName}</p>
              )}
            </h3>
            {recipientSnapshot ? (
              <p className="text-sm text-gray-100">
                Last active:{` `}
                {recipient?.lastSeen?.toDate() ? (
                  <TimeAgo datetime={recipient?.lastSeen?.toDate()} />
                ) : (
                  "Unavailable"
                )}
              </p>
            ) : (
              <p className="mb-1 text-white">Loading Last active...</p>
            )}
          </div>
        </div>

        <div className="p-8 h-[66vh] border-t-[1px] border-indigo-500 overflow-scroll hidescrollbar">
          {showMessages()}
          <div className="" ref={endOfMessagesRef} />
        </div>

        <form className="flex items-center p-3 sticky rounded-b-x l border-t-[1px] border-indigo-500 bg-[#3736AA] z-50">
          <div
            onClick={() => filepickerRef.current.click()}
            className="inputIcon"
          >
            <PaperClipIcon className="text-gray-100 h-6 w-6 cursor-pointer mr-2" />
            <input
              onChange={addImageToPost}
              ref={filepickerRef}
              type="file"
              hidden
              accept="image/*"
            />
          </div>
          <EmojiHappyIcon
            ref={ref}
            onClick={() => setIsComponentVisible(!isComponentVisible)}
            className="text-gray-100 h-7 w-7 md:h-6 md:w-6 cursor-pointer mr-2"
          />
          {isComponentVisible && (
            <span ref={ref} className="absolute z-50 mb-[500px]">
              <Picker onSelect={addEmoji} />
            </span>
          )}
          <MicrophoneIcon
            onClick={textToSpeech}
            className={`${
              hearing && "text-red-500"
            }     text-white h-7 w-7 md:h-6 md:w-6 cursor-pointer`}
          />
          <input
            className="w-full p-4 md:mx-4 mx-2 bg-white border-none rounded-lg outline-none backdrop-filter backdrop-blur-2xl bg-opacity-10  text-white ml-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            ref={focusRef}
            type="text"
          />

          <button
            type="submit"
            onClick={sendMessage}
            disabled={!input || input[0] === " "}
          >
            <PaperAirplaneIcon
              className={`${
                !input || input[0] === " "
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-gray-100 cursor-pointer"
              } rotate-90 h-7 w-7 md:h-6 md:w-6 mr-2`}
            />
          </button>
          {imageToPost && (
            <div
              onClick={removeImage}
              className="flex flex-col transition duration-150 transform cursor-pointer filter hover:brightness-110 hover:scale-105"
            >
              <div className="h-10 w-10 relative object-contain">
                <Image
                  objectFit="contain"
                  layout="fill"
                  alt={recipient?.name}
                  className="object-contain h-10 "
                  src={imageToPost}
                />
              </div>
              <p className="text-xs text-center text-red-500">Remove</p>
            </div>
          )}
        </form>
      </div>
    </Fade>
  );
};

export default ChatScreen;
