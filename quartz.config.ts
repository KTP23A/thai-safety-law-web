import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "คลังกฎหมายความปลอดภัย 🇹🇭",
    pageTitleSuffix: " | Thai Safety Law",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "th-TH",
    baseUrl: "thai-safety-law.vercel.app",
    ignorePatterns: ["private", "_templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Sarabun",
        body: "Sarabun",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#fafafa",
          lightgray: "#e8e8e8",
          gray: "#a0a0a0",
          darkgray: "#3a3a3a",
          dark: "#1a1a2e",
          secondary: "#1a3c6e",
          tertiary: "#2196f3",
          highlight: "rgba(33, 150, 243, 0.10)",
          textHighlight: "#fff59d88",
        },
        darkMode: {
          light: "#16213e",
          lightgray: "#0f3460",
          gray: "#5a7fa0",
          darkgray: "#d0d8e8",
          dark: "#e8edf5",
          secondary: "#4fc3f7",
          tertiary: "#81d4fa",
          highlight: "rgba(79, 195, 247, 0.12)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
