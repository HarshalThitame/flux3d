import type { Metadata } from "next";
import GalleryAdminClient from "./GalleryAdminClient";

export const metadata: Metadata = {
  title: "Gallery — Admin",
  description: "Curate the public Flux3D gallery.",
};

export default function AdminGalleryPage() {
  return <GalleryAdminClient />;
}
