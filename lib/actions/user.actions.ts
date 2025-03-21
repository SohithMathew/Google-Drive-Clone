"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])],
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);

    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) throw new Error("Failed to send an OTP");

  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      },
    );
  }

  return parseStringify({ accountId });
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();

    const session = await account.createSession(accountId, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  try {
    const { databases, account } = await createSessionClient();

    const result = await account.get();

    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accountId", result.$id)],
    );

    if (user.total <= 0) return null;

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error);
  }
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();

  try {
    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    // User exists, send OTP
    if (existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId });
    }

    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};



// "use server";

// import { createAdminClient, createSessionClient } from "@/lib/appwrite";
// import { appwriteConfig } from "@/lib/appwrite/config";
// import { Query, ID } from "node-appwrite";
// import { parseStringify } from "@/lib/utils";
// import { cookies } from "next/headers";
// import { avatarPlaceholderUrl } from "@/constants";
// import { redirect } from "next/navigation";

// const getUserByEmail = async (email: string) => {
//   const { databases } = await createAdminClient();

//   const result = await databases.listDocuments(
//     appwriteConfig.databaseId,
//     appwriteConfig.usersCollectionId,
//     [Query.equal("email", [email])]
//   );

//   return result.total > 0 ? result.documents[0] : null;
// };

// const handleError = (error: unknown, message: string) => {
//   console.error(message, error);
//   throw error;
// };

// export const sendEmailOTP = async ({ email }: { email: string }) => {
//   const { account } = await createAdminClient();

//   try {
//     const session = await account.createEmailToken(ID.unique(), email);
//     console.log("✅ OTP sent successfully to:", email);
//     return session.userId;
//   } catch (error) {
//     handleError(error, "❌ Failed to send email OTP");
//   }
// };
// export const sendEmailOTP = async ({ email }: { email: string }) => {
//   const { account } = await createAdminClient();

//   try {
//     // ✅ Check if the user already exists
//     const existingUser = await getUserByEmail(email);
//     let accountId;

//     if (existingUser) {
//       accountId = existingUser.accountId; // Use existing user ID
//     } else {
//       // ✅ Generate a temporary password
//       const tempPassword = Math.random().toString(36).slice(-8);

//       // ✅ Create a new account
//       const newUser = await account.create(ID.unique(), email, tempPassword, email);
//       accountId = newUser.$id;
//     }

//     // ✅ Send OTP for authentication
//     await account.createEmailToken(accountId, email);

//     return accountId; // ✅ Return account ID
//   } catch (error) {
//     handleError(error, "Failed to send email OTP");
//   }
// };



// export const createAccount = async ({
//   fullName,
//   email,
// }: {
//   fullName: string;
//   email: string;
// }) => {
//   const existingUser = await getUserByEmail(email);

//   if (existingUser) {
//     console.log("✅ User already exists:", existingUser);
//     return parseStringify({ accountId: existingUser.accountId });
//   }

//   const accountId = await sendEmailOTP({ email });
//   if (!accountId) throw new Error("❌ Failed to send an OTP");

//   const { databases } = await createAdminClient();

//   await databases.createDocument(
//     appwriteConfig.databaseId,
//     appwriteConfig.usersCollectionId,
//     ID.unique(),
//     {
//       fullName,
//       email,
//       avatar: avatarPlaceholderUrl,
//       accountId, // ✅ Fixed missing "accountId" field
//     }
//   );

//   console.log("✅ New account created:", { fullName, email, accountId });
//   return parseStringify({ accountId });
// };



// export const verifySecret = async ({
//   accountId,
//   password,
// }: {
//   accountId: string;
//   password: string;
// }) => {
//   try {
//     const { account } = await createAdminClient();
//     const session = await account.createSession(accountId, password);

//     if (!session || !session.secret) {
//       throw new Error("❌ Failed to create session");
//     }

//     console.log("✅ Session created successfully:", session);

//     const cookieStore = cookies();
//     (await cookies()).set("appwrite-session", session.secret, {
//       path: "/",
//       httpOnly: true,
//       sameSite: "strict",
//       secure: true,
//     });
    

//     return parseStringify({ sessionId: session.$id });
//   } catch (error) {
//     handleError(error, "❌ Failed to verify OTP");
//   }
// };

// export const getCurrentUser = async () => {
//   try {
//     const cookieStore = cookies();
//     const session = (await cookies()).get("appwrite-session");


//     if (!session) {
//       console.log("❌ No session found in cookies");
//       return null;
//     }

//     const { databases, account } = await createSessionClient();
//     const result = await account.get();

//     console.log("✅ Fetched account info:", result);

//     const user = await databases.listDocuments(
//       appwriteConfig.databaseId,
//       appwriteConfig.usersCollectionId,
//       [Query.equal("accountId", result.$id)]
//     );

//     if (user.total <= 0) {
//       console.log("❌ No user found with accountId:", result.$id);
//       return null;
//     }

//     console.log("✅ User found:", user.documents[0]);
//     return parseStringify(user.documents[0]);
//   } catch (error) {
//     console.error("❌ Error fetching user:", error);
//     return null;
//   }
// };

// export const signOutUser = async () => {
//   try {
//     const { account } = await createSessionClient();
//     await account.deleteSession("current");

//     const cookieStore = cookies();
//     (await cookies()).delete("appwrite-session");

//     console.log("✅ User signed out successfully.");
//   } catch (error) {
//     handleError(error, "❌ Failed to sign out user");
//   } finally {
//     redirect("/sign-in");
//   }
// };

// export const signInUser = async ({ email }: { email: string }) => {
//   try {
//     const existingUser = await getUserByEmail(email);

//     if (existingUser) {
//       await sendEmailOTP({ email });
//       console.log("✅ Sign-in OTP sent for:", email);
//       return parseStringify({ accountId: existingUser.accountId });
//     }

//     console.log("❌ User not found:", email);
//     return parseStringify({ accountId: null, error: "User not found" });
//   } catch (error) {
//     handleError(error, "❌ Failed to sign in user");
//   }
// };
