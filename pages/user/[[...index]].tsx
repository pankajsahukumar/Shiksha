import { NextSeo } from "next-seo";
import { UserProfile } from "@clerk/clerk-react";
import Header from "../../components/Header";

export default function UserProfilePage() {
  return (
    <div className="dark:bg-gray-900 bg-indigo-700">
      <NextSeo title="Your profile" />
      <Header />
      <UserProfile path="/user" routing="path" />;
    </div>
  );
}
