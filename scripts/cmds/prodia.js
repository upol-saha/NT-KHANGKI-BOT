const axios = require("axios");

 module.exports = {
 config: {
 name: "prodia",
 version: "1.1",
 author: " UPoL Apis 🐔",
 role: 0,
 shortDescription: {
 en: 'Text to Image'
 },
 category: "image",
 guide: {
 en: `{pn} your prompt | type models here are \n
1 | upol_v1.onciener.97 [68b2jdl]
2 | 3Guofeng3_v34.safetensors [50f420de]
3 | absolutereality_V16.safetensors [37db0fc3]
4 | absolutereality_v181.safetensors [3d9d4d2b]
5 | analog-diffusion-1.0.ckpt [9ca13f02]
6 | anythingv3_0-pruned.ckpt [2700c435]
7 | anything-v4.5-pruned.ckpt [65745d25]
8 | anythingV5_PrtRE.safetensors [893e49b9]
9 | AOM3A3_orangemixs.safetensors [9600da17]
10 | blazing_drive_v10g.safetensors [ca1c1eab]
11 | cetusMix_Version35.safetensors [de2f2560]
12 | childrensStories_v13D.safetensors [9dfaabcb]
13 | childrensStories_v1SemiReal.safetensors [a1c56dbb]
14 | childrensStories_v1ToonAnime.safetensors [2ec7b88b]
15 | Counterfeit_v30.safetensors [9e2a8f19]
16 | cuteyukimixAdorable_midchapter3.safetensors [04bdffe6]
17 | cyberrealistic_v33.safetensors [82b0d085]
18 | dalcefo_v4.safetensors [425952fe]
19 | deliberate_v2.safetensors [10ec4b29]
20 | deliberate_v3.safetensors [afd9d2d4]
21 | dreamlike-anime-1.0.safetensors [4520e090]
22 | dreamlike-diffusion-1.0.safetensors [5c9fd6e0]
23 | dreamlike-photoreal-2.0.safetensors [fdcf65e7]
24 | dreamshaper_6BakedVae.safetensors [114c8abb]
25 | dreamshaper_7.safetensors [5cf5ae06]
26 | dreamshaper_8.safetensors [9d40847d]
27 | edgeOfRealism_eorV20.safetensors [3ed5de15]
28 | EimisAnimeDiffusion_V1.ckpt [4f828a15]
29 | elldreths-vivid-mix.safetensors [342d9d26]
30 | epicrealism_naturalSinRC1VAE.safetensors [90a4c676]
31 | ICantBelieveItsNotPhotography_seco.safetensors [4e7a3dfd]
32 | juggernaut_aftermath.safetensors [5e20c455]
33 | lofi_v4.safetensors [ccc204d6]
34 | lyriel_v16.safetensors [68fceea2]
35 | majicmixRealistic_v4.safetensors [29d0de58]
36 | mechamix_v10.safetensors [ee685731]
37 | meinamix_meinaV9.safetensors [2ec66ab0]
38 | meinamix_meinaV11.safetensors [b56ce717]
39 | neverendingDream_v122.safetensors [f964ceeb]
40 | openjourney_V4.ckpt [ca2f377f]
41 | pastelMixStylizedAnime_pruned_fp16.safetensors [793a26e8]
42 | portraitplus_V1.0.safetensors [1400e684]
43 | protogenx34.safetensors [5896f8d5]
44 | Realistic_Vision_V1.4-pruned-fp16.safetensors [8d21810b]
45 | Realistic_Vision_V2.0.safetensors [79587710]
46 | Realistic_Vision_V4.0.safetensors [29a7afaa]
47 | Realistic_Vision_V5.0.safetensors [614d1063]
48 | redshift_diffusion-V10.safetensors [1400e684]
49 | revAnimated_v122.safetensors [3f4fefd9]
50 | rundiffusionFX25D_v10.safetensors [cd12b0ee]
51 | rundiffusionFX_v10.safetensors [cd4e694d]
52 | sdv1_4.ckpt [7460a6fa]
53 | v1-5-pruned-emaonly.safetensors [d7049739]
54 | shoninsBeautiful_v10.safetensors [25d8c546]
55 | theallys-mix-ii-churned.safetensors [5d9225a4]
56 | timeless-1.0.ckpt [7c4971d4] `
 }
 },
 onStart: async function ({ message, api, args, event }) {
 const text = args.join(' ');

 if (!text) {
 return message.reply("Please provide a prompt with models");
 }
   await message.reply('Creating.....');
 const a = "repl";
 const [prompt, model] = text.split('|').map((text) => text.trim());
 const models = model || "5";
 const baseURL = `https://upolsaha-free-apis.onrender.com/prodia?prompt=${prompt}&model=${models}`;

 api.setMessageReaction("", event.messageID, () => {}, true);

 message.reply("", async (err, info) => {
 message.reply({
 attachment: await global.utils.getStreamFromURL(baseURL)
 });
 let ui = info.messageID;
 message.unsend(ui);
 api.setMessageReaction("", event.messageID, () => {}, true);
 });
 }
};
