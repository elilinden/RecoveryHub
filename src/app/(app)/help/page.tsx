import Link from "next/link";
import Image from "next/image";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/auth/session";
import { helpImageDimensions, helpSections } from "@/lib/help/content";
import { cn } from "@/lib/utils";

type HelpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = (await searchParams) ?? {};
  await requireActiveProfile();

  const activeSlug = readParam(params.section);
  const active = helpSections.find((section) => section.slug === activeSlug) ?? helpSections[0];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="A guided walkthrough of every part of Recovery Hub, for new and returning users alike." title="How to Use" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Guide sections" className="flex gap-2 overflow-x-auto pb-1 lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {helpSections.map((section) => {
            const Icon = section.icon;
            const isActive = section.slug === active.slug;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
                href={`/help?section=${section.slug}`}
                key={section.slug}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{section.title}</span>
              </Link>
            );
          })}
        </nav>

        <Card className="min-w-0 flex-1 border-border bg-card shadow-sm">
          <CardContent className="space-y-8 p-5">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{active.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>
            </div>

            {active.blocks.map((block, index) => (
              <div className="space-y-3" key={`${active.slug}-${index}`}>
                {block.heading ? <h3 className="text-base font-semibold text-foreground">{block.heading}</h3> : null}
                {block.paragraphs?.map((paragraph, paragraphIndex) => (
                  <p className="text-sm leading-6 text-muted-foreground" key={paragraphIndex}>
                    {paragraph}
                  </p>
                ))}
                {block.bullets ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                    {block.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {block.image ? (
                  <div className="overflow-hidden rounded-lg border border-border shadow-sm">
                    <Image
                      alt={block.image.alt}
                      className="h-auto w-full"
                      height={helpImageDimensions[block.image.src]?.height ?? 1400}
                      src={block.image.src}
                      width={helpImageDimensions[block.image.src]?.width ?? 2940}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
