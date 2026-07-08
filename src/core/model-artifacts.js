export function buildModelArtifactBundle(run, execution) {
  const files = {};
  const items = [];
  const results = Array.isArray(execution?.results) ? execution.results : [];
  const artifactId = execution?.id || `${run.contentId}-artifact`;

  for (const result of results) {
    if (result.adapterId === "claude-writing") {
      collectClaudeArtifact(run, result, files, items);
    } else if (result.adapterId === "gpt-image") {
      collectImageArtifact(run, result, files, items);
    } else if (result.adapterId === "wordpress-headless") {
      collectWordPressArtifact(result, files, items);
    } else if (["google-search-console", "ga4-data", "gtm-schema"].includes(result.adapterId)) {
      collectTrackingArtifact(result, files, items);
    }
  }

  const manifest = {
    artifactId,
    contentId: run.contentId,
    executionId: execution?.id || "",
    generatedAt: new Date().toISOString(),
    primaryKeyword: run.input?.primaryKeyword,
    category: run.input?.category,
    title: run.publishing?.ownedBlog?.title,
    itemCount: items.length,
    items,
    files: Object.keys(files)
  };

  files["manifest.json"] = {
    body: manifest,
    mimeType: "application/json; charset=utf-8"
  };

  return { manifest, files };
}

export function summarizeModelArtifacts(modelArtifacts) {
  if (!modelArtifacts) return null;
  return {
    artifactId: modelArtifacts.artifactId,
    contentId: modelArtifacts.contentId,
    executionId: modelArtifacts.executionId,
    generatedAt: modelArtifacts.generatedAt,
    itemCount: modelArtifacts.itemCount,
    files: modelArtifacts.files,
    path: modelArtifacts.path,
    url: modelArtifacts.url
  };
}

function collectClaudeArtifact(run, result, files, items) {
  const text = extractClaudeText(result.output);
  if (text) {
    const filename = "claude-draft.md";
    files[filename] = {
      body: text,
      mimeType: "text/markdown; charset=utf-8"
    };
    items.push({
      type: "draft-article",
      adapterId: result.adapterId,
      mode: result.mode,
      status: result.ok ? "captured" : "needs-review",
      filename,
      title: run.publishing?.ownedBlog?.title || run.architecture?.h1,
      description: "Claude live response normalized as a reusable Markdown draft."
    });
    return;
  }

  if (result.preview?.promptInputs) {
    const filename = "claude-prompt-inputs.json";
    files[filename] = {
      body: result.preview.promptInputs,
      mimeType: "application/json; charset=utf-8"
    };
    items.push({
      type: "draft-prompt-plan",
      adapterId: result.adapterId,
      mode: result.mode,
      status: "planned",
      filename,
      title: run.architecture?.h1,
      description: "Dry-run prompt inputs for the Claude writing step."
    });
  }
}

function collectImageArtifact(run, result, files, items) {
  const outputData = Array.isArray(result.output?.data) ? result.output.data : [];
  if (outputData.length) {
    outputData.forEach((asset, index) => {
      const brief = findImageBrief(run, result.sectionId, index);
      if (asset.b64_json) {
        const filename = brief?.filename || `generated-image-${index + 1}.png`;
        files[filename] = {
          body: asset.b64_json,
          encoding: "base64",
          mimeType: "image/png"
        };
        items.push({
          type: "image-asset",
          adapterId: result.adapterId,
          mode: result.mode,
          status: result.ok ? "captured" : "needs-review",
          filename,
          sectionId: brief?.sectionId || result.sectionId || "",
          alt: brief?.alt || "",
          description: "OpenAI image response saved as a local asset."
        });
      } else if (asset.url) {
        const filename = `generated-image-url-${index + 1}.json`;
        files[filename] = {
          body: {
            url: asset.url,
            revisedPrompt: asset.revised_prompt || "",
            brief
          },
          mimeType: "application/json; charset=utf-8"
        };
        items.push({
          type: "image-url",
          adapterId: result.adapterId,
          mode: result.mode,
          status: result.ok ? "captured" : "needs-review",
          filename,
          sectionId: brief?.sectionId || result.sectionId || "",
          alt: brief?.alt || "",
          description: "OpenAI image URL captured with its SEO image brief."
        });
      }
    });
    return;
  }

  if (result.preview?.imagePrompts) {
    const filename = "gpt-image-prompts.json";
    files[filename] = {
      body: result.preview.imagePrompts,
      mimeType: "application/json; charset=utf-8"
    };
    items.push({
      type: "image-prompt-plan",
      adapterId: result.adapterId,
      mode: result.mode,
      status: "planned",
      filename,
      title: "GPT image prompt plan",
      description: "Dry-run image prompts with ALT text and filenames."
    });
  }
}

function collectWordPressArtifact(result, files, items) {
  const filename = result.mode === "live" ? "wordpress-draft.json" : "wordpress-preview-payload.json";
  files[filename] = {
    body: result.output || result.preview || result,
    mimeType: "application/json; charset=utf-8"
  };
  items.push({
    type: result.mode === "live" ? "wordpress-draft" : "wordpress-draft-plan",
    adapterId: result.adapterId,
    mode: result.mode,
    status: result.ok ? "captured" : "needs-review",
    filename,
    description: "WordPress draft or dry-run publish payload."
  });
}

function collectTrackingArtifact(result, files, items) {
  const filename = `${result.adapterId}.json`;
  files[filename] = {
    body: result.output || result.preview || result,
    mimeType: "application/json; charset=utf-8"
  };
  items.push({
    type: "tracking-contract",
    adapterId: result.adapterId,
    mode: result.mode,
    status: result.ok ? "captured" : "needs-review",
    filename,
    description: "Analytics, Search Console, or GTM contract output."
  });
}

function extractClaudeText(output) {
  if (!output) return "";
  if (typeof output.completion === "string") return output.completion;
  if (typeof output.text === "string") return output.text;
  if (Array.isArray(output.content)) {
    return output.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text" && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function findImageBrief(run, sectionId, index) {
  if (sectionId) {
    const bySection = run.imageBriefs?.find((brief) => brief.sectionId === sectionId);
    if (bySection) return bySection;
  }
  return run.imageBriefs?.[index] || null;
}
