import type { NextPage } from "next";
import type { AppProps } from "next/app";

export type NextPageWithAuth<P = object, IP = P> = NextPage<P, IP> & {
  requireAuth?: boolean;
};

export type AppPropsWithAuth = AppProps & {
  Component: NextPageWithAuth;
};
