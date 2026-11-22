import type { Metadata } from "next";
import ProjectsClient from "./ProjectsClient";
import "./projects.css";
export const metadata: Metadata = { title: "Projects | DPM Enterprise OS", description: "Project execution and tracking" };
export default function ProjectsPage(){ return <ProjectsClient/>; }
