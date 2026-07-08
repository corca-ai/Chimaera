import { runContentLoop } from "../core/pipeline.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  })
);

const result = runContentLoop({
  channel: args.channel,
  category: args.category,
  primaryKeyword: args.keyword,
  brandName: args.brand,
  productName: args.product,
  leadGoal: args.lead
});

console.log(JSON.stringify(result, null, 2));
