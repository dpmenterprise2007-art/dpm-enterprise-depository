import type { Metadata } from "next";
import QuotationsClient from "./QuotationsClient";
import "./quotations.css";
export const metadata: Metadata = { title: "BOQ & Quotations | DPM Enterprise OS", description: "BOQ and GST quotation workflow" };
export default function QuotationsPage(){return <QuotationsClient/>;}
