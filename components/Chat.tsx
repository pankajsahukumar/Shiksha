import Image from "next/image";
import { useRouter } from "next/router";
import React from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "../firebase";
import getRecipientEmail from "../utils/getRecipientEmail";

type ChatProps = {
  id: string;
  users: [string];
};

const Chat: React.FC<ChatProps> = ({ id, users }) => {
  const router = useRouter();
  const user = (window as Window)?.Clerk?.user;
  const [recipientSnapshot] = useCollection(
    db
      .collection("users")
      .where(
        "email",
        "==",
        getRecipientEmail(users, user?.primaryEmailAddress?.emailAddress)
      )
  );

  const enterChat = () => {
    router.push(`/chat/${id}`);
  };

  const recipient = recipientSnapshot?.docs?.[0]?.data();
  const recipientEmail = getRecipientEmail(
    users,
    user?.primaryEmailAddress?.emailAddress
  );

  return (
    <div
      className="sidebarChat flex items-center cursor-pointer p-4 break-words bg-darkblue border-b-[1px] border-indigo-500"
      onClick={enterChat}
    >
      {recipient ? (
        <Image
          width={56}
          height={56}
          className="m-1 mr-4 z-0 rounded-full"
          alt={recipient?.name || "avatar"}
          src={recipient?.photoURL}
        />
      ) : (
        <p className="text-center flex items-center justify-center z-0 w-14 h-14 rounded-full bg-gray-300 text-black text-xl capitalize">
          {recipientEmail && recipientEmail[0]}
        </p>
      )}
      <div className="ml-5">
        {recipient?.firstname ? (
          <p className="recipientName">{recipient?.firstname}</p>
        ) : (
          <p className="recipientName">{recipient?.name}</p>
        )}
      </div>
    </div>
  );
};

export default Chat;
