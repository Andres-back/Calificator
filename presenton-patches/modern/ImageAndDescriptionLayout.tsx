import React from "react";
import * as z from "zod";
import { ImageSchema } from "../defaultSchemes";

export const layoutId = "image-and-description";
export const layoutName = "Image And Description";
export const layoutDescription =
  "A slide layout with a title, a concise educational explanation, and a supporting image.";

const imageWithDescriptionSlideSchema = z.object({
  title: z.string().min(3).max(30).default("Tema de clase").meta({
    description: "Main title of the slide",
  }),
  content: z
    .string()
    .min(25)
    .max(300)
    .default("Contenido educativo claro y breve para explicar la idea central de la diapositiva.")
    .meta({
      description: "Main educational content for the slide",
    }),
  image: ImageSchema.default({
    __image_url__:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop",
    __image_prompt__: "Educational visual background",
  }).meta({
    description: "Supporting classroom image for the slide",
  }),
});

export const Schema = imageWithDescriptionSlideSchema;

export type ImageWithDescriptionSlideData = z.infer<typeof imageWithDescriptionSlideSchema>;

interface ImageWithDescriptionSlideLayoutProps {
  data?: Partial<ImageWithDescriptionSlideData>;
}

const clampStyle = (lines: number): React.CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lines,
  overflow: "hidden",
});

const ImageWithDescriptionSlideLayout: React.FC<ImageWithDescriptionSlideLayoutProps> = ({
  data: slideData,
}) => {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="w-full rounded-sm max-w-[1280px] aspect-video relative z-20 mx-auto overflow-hidden"
        style={{
          fontFamily: "var(--heading-font-family,Montserrat)",
          backgroundColor: "var(--background-color, #FFFFFF)",
        }}
      >
        <div className="flex h-full gap-12 px-16 py-14">
          <div className="w-[49%] min-w-0 rounded-lg border overflow-hidden flex items-center justify-center p-4"
            style={{
              backgroundColor: "var(--card-color, #F5F8FE)",
              borderColor: "var(--stroke, #E5E7EB)",
            }}
          >
            {slideData?.image?.__image_url__ ? (
              <img
                src={slideData.image.__image_url__}
                alt={slideData.image.__image_prompt__ || slideData?.title || "slide-image"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="h-full w-full rounded-md" style={{ backgroundColor: "var(--stroke, #E5E7EB)" }} />
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {slideData?.title && (
              <h2
                className="text-4xl font-bold leading-tight mb-8"
                style={{
                  color: "var(--background-text, #1E4CD9)",
                  ...clampStyle(3),
                }}
              >
                {slideData.title}
              </h2>
            )}

            {slideData?.content && (
              <div
                className="text-xl leading-relaxed font-normal max-w-xl"
                style={{
                  color: "var(--background-text, #334155)",
                  ...clampStyle(8),
                }}
              >
                {slideData.content}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-1.5 w-full" style={{ backgroundColor: "var(--primary-color, #1E4CD9)" }} />
      </div>
    </>
  );
};

export default ImageWithDescriptionSlideLayout;
