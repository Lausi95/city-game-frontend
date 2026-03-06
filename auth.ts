import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

declare module "next-auth" {
  interface Session {
    idToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    idToken?: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.idToken = account.id_token;
      }
      return token;
    },
    session({ session, token }) {
      session.idToken = token.idToken;
      return session;
    },
  },
});
