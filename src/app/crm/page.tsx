import CrmClient from "./CrmClient";\nimport "./crm.css";

export const metadata = { title: "CRM | DPM Enterprise OS", description: "CRM leads and customer pipeline" };

export default function CrmPage() {
  return <CrmClient />;
}
