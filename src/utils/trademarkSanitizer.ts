/**
 * Gen-z Ai Studio - Microstock Trademark & Copyright Sanitizer
 *
 * Microstock agencies (Adobe Stock, Shutterstock, Freepik, iStock, Getty, etc.)
 * strictly reject submissions containing brand names, registered trademarks,
 * copyrighted character names, or proprietary product lines.
 *
 * This module ensures prompts, titles, descriptions, and keywords are 100% free
 * of any trademarked or copyrighted intellectual property.
 */

// Comprehensive dictionary of generic replacements for common trademarked entities
const TRADEMARK_REPLACEMENTS: [RegExp, string][] = [
  // Tech & Devices
  [/\b(?:Apple\s+)?(?:iPhone|iPhones)\b/gi, 'modern smartphone'],
  [/\b(?:Apple\s+)?(?:iPad|iPads)\b/gi, 'digital touchscreen tablet'],
  [/\b(?:Apple\s+)?(?:MacBook|MacBooks|MacBook\s+Pro|MacBook\s+Air|iMac)\b/gi, 'sleek silver laptop computer'],
  [/\b(?:Apple\s+Watch|SmartWatch|Smart\s+Watch)\b/gi, 'digital smartwatch'],
  [/\b(?:AirPods|AirPods\s+Pro|Galaxy\s+Buds)\b/gi, 'wireless earbuds'],
  [/\b(?:Apple|macOS|iOS)\b/gi, 'modern tech'],
  [/\b(?:Samsung\s+Galaxy|Galaxy\s+S\d+|Galaxy\s+Ultra)\b/gi, 'flagship smartphone'],
  [/\bSamsung\b/gi, 'smart device'],
  [/\b(?:Microsoft\s+Windows|Windows\s+11|Windows\s+10|Windows)\b/gi, 'operating system interface'],
  [/\b(?:Microsoft\s+)?(?:Office|Word|Excel|PowerPoint|Azure)\b/gi, 'office productivity software'],
  [/\bMicrosoft\b/gi, 'technology system'],
  [/\b(?:Sony\s+PlayStation|PlayStation\s+\d+|PS\d|PS5|PS4)\b/gi, 'home gaming console'],
  [/\b(?:Nintendo\s+Switch|Nintendo)\b/gi, 'hybrid video game console'],
  [/\b(?:Xbox|Xbox\s+Series\s+[XS]|Xbox\s+One)\b/gi, 'entertainment game console'],
  [/\b(?:Sony\s+Alpha|Canon|Nikon|Fujifilm|Olympus|Panasonic\s+Lumix|Leica|GoPro)\b/gi, 'professional mirrorless camera'],
  [/\b(?:Intel|AMD\s+Ryzen|Nvidia\s+GeForce|Nvidia|GeForce|RTX\s+\d+)\b/gi, 'high performance graphics processor'],
  [/\b(?:Dell|HP|Lenovo|ThinkPad|Asus|Acer|Alienware)\b/gi, 'high performance workstation computer'],
  [/\b(?:Google\s+Pixel|Pixel\s+\d+)\b/gi, 'modern smartphone'],
  [/\b(?:Google\s+Drive|Google\s+Maps|Gmail|Google\s+Chrome|Chrome)\b/gi, 'web application service'],
  [/\bGoogle\b/gi, 'search platform'],
  [/\b(?:Oculus|Meta\s+Quest|Quest\s+\d+|Apple\s+Vision\s+Pro)\b/gi, 'virtual reality VR headset'],
  [/\b(?:Xiaomi|Huawei|Oppo|Vivo|OnePlus)\b/gi, 'mobile smartphone'],

  // Creative & Stock Platforms
  [/\b(?:Adobe\s+)?(?:Photoshop|Lightroom|Illustrator|InDesign|Premiere\s+Pro|After\s+Effects|Acrobat|Creative\s+Cloud)\b/gi, 'professional digital graphic design software'],
  [/\b(?:Adobe\s+Stock|Adobe)\b/gi, 'creative digital platform'],
  [/\b(?:Shutterstock|Freepik|iStock|Getty\s+Images|Getty|Envato|Vecteezy|Depositphotos|Dreamstime|Alamy|Pond5|123RF)\b/gi, 'commercial stock marketplace'],
  [/\bCanva\b/gi, 'graphic design editor'],
  [/\b(?:Midjourney|Stable\s+Diffusion|DALL[-·]?E|FLUX(?:\.1)?|ChatGPT|OpenAI|Claude|Gemini|Mistral)\b/gi, 'generative AI synthesis'],

  // Sportswear & Fashion Brands
  [/\b(?:Nike\s+Air\s+Jordan|Air\s+Jordan|Jordans?)\b/gi, 'high-top basketball sneakers'],
  [/\b(?:Nike|Swoosh)\b/gi, 'athletic sportswear'],
  [/\b(?:Adidas|Stan\s+Smith|Yeezy|Superstar)\b/gi, 'sporty athletic streetwear'],
  [/\b(?:Puma|Reebok|Under\s+Armour|New\s+Balance|Asics)\b/gi, 'athletic sportswear apparel'],
  [/\b(?:Converse|Chuck\s+Taylor|All\s+Star|Vans|Fila)\b/gi, 'canvas streetwear shoes'],
  [/\b(?:Gucci|Prada|Chanel|Dior|Louis\s+Vuitton|Versace|Armani|Balenciaga|Burberry|Hermès|Yves\s+Saint\s+Laurent|YSL|Fendi)\b/gi, 'luxury haute couture designer'],
  [/\b(?:Rolex|Cartier|Omega|Patek\s+Philippe|Audemars\s+Piguet|Tag\s+Heuer)\b/gi, 'luxury luxury Swiss timepiece watch'],
  [/\bRay[-·]?Ban\b/gi, 'classic vintage sunglasses'],

  // Food & Beverages
  [/\b(?:Coca[-·]?Cola|Coke|Diet\s+Coke)\b/gi, 'refreshing carbonated cola soda'],
  [/\b(?:Pepsi|Sprite|Fanta|Mountain\s+Dew|Dr\s+Pepper)\b/gi, 'chilled sparkling soft drink soda'],
  [/\bRed\s+Bull\b/gi, 'energy boost drink'],
  [/\bStarbucks\b/gi, 'artisan coffee shop beverage'],
  [/\b(?:McDonald'?s|Big\s+Mac)\b/gi, 'fast food burger restaurant'],
  [/\b(?:KFC|Kentucky\s+Fried\s+Chicken)\b/gi, 'crispy fried chicken meal'],
  [/\b(?:Burger\s+King|Whopper|Subway|Pizza\s+Hut|Domino'?s)\b/gi, 'quick service restaurant meal'],
  [/\b(?:Nestlé|KitKat|Kit[-·]?Kat|Oreo|Nutella|Ferrero\s+Rocher|Ferrero|M&M'?s|Snickers)\b/gi, 'sweet chocolate confectionery dessert'],

  // Automotive
  [/\b(?:Tesla|Tesla\s+Model\s+[3SXY]|Cybertruck)\b/gi, 'aerodynamic futuristic electric vehicle'],
  [/\b(?:Ferrari|Lamborghini|Porsche|Bugatti|McLaren|Aston\s+Martin)\b/gi, 'exotic high-speed sports supercar'],
  [/\b(?:BMW|Mercedes[-·]?Benz|Mercedes|Audi)\b/gi, 'luxury German executive automobile'],
  [/\b(?:Toyota|Honda|Nissan|Mazda|Mitsubishi|Hyundai|Kia|Subaru)\b/gi, 'modern reliable passenger automobile'],
  [/\b(?:Ford|Chevrolet|Volkswagen|Volvo|Jeep|Land\s+Rover|Range\s+Rover)\b/gi, 'rugged all-terrain sport utility SUV vehicle'],

  // Entertainment, Toys & Characters
  [/\b(?:LEGO|Legos)\b/gi, 'colorful interlocking plastic construction building toy bricks'],
  [/\bBarbie\b/gi, 'stylish fashion doll figure'],
  [/\bHot\s+Wheels\b/gi, 'miniature die-cast metal toy vehicle'],
  [/\b(?:Pokémon|Pokemon|Pikachu|Charizard)\b/gi, 'fantasy pocket monster creature'],
  [/\b(?:Walt\s+)?Disney(?:land|world)?\b/gi, 'family animated fantasy world'],
  [/\bPixar\b/gi, '3D computer animated film art'],
  [/\b(?:Marvel|Marvel\s+Comics|Avengers|Iron\s+Man|Captain\s+America|Thor|Hulk|Spider[-·]?Man|Black\s+Panther)\b/gi, 'cinematic heroic comic superhero'],
  [/\b(?:DC|DC\s+Comics|Superman|Batman|Wonder\s+Woman|The\s+Flash|Joker|Aquaman)\b/gi, 'iconic comic superhero vigilante'],
  [/\b(?:Warner\s+Bros\.?|Universal\s+Studios|Paramount|Sony\s+Pictures)\b/gi, 'major motion picture film studio'],
  [/\b(?:Harry\s+Potter|Hogwarts|Voldemort)\b/gi, 'wizardry fantasy magic academy'],
  [/\b(?:Star\s+Wars|Darth\s+Vader|Jedi|Lightsaber|Yoda)\b/gi, 'epic sci-fi galaxy space opera'],
  [/\bTransformers\b/gi, 'transforming sentient mechanical alien robot'],
  [/\bJurassic\s+Park\b/gi, 'prehistoric dinosaur wildlife sanctuary'],
  [/\bMinions?\b/gi, 'playful yellow animated cartoon helpers'],
  [/\bHello\s+Kitty\b/gi, 'cute Japanese kawaii cartoon character'],
  [/\bSonic\s+the\s+Hedgehog\b/gi, 'speedy blue video game protagonist'],
  [/\b(?:Minecraft|Fortnite|Roblox|PUBG|Call\s+of\s+Duty|Grand\s+Theft\s+Auto|GTA\s*[IVX]*)\b/gi, 'interactive 3D video game virtual landscape'],
  [/\b(?:FIFA|UEFA|NBA|NFL|MLB|Formula\s+1|F1|Wimbledon|Olympics)\b/gi, 'premier international athletic championship tournament'],

  // Social Media & Services
  [/\b(?:YouTube|You\s+Tube)\b/gi, 'online streaming video channel'],
  [/\b(?:Netflix|Hulu|HBO|Prime\s+Video|Disney\+)\b/gi, 'digital video streaming network'],
  [/\b(?:Facebook|Meta|Instagram|TikTok|WhatsApp|X|Twitter|Snapchat|LinkedIn|Pinterest|Reddit|Discord|Telegram|Zoom|Twitch)\b/gi, 'social networking digital community'],
  [/\b(?:PayPal|Visa|Mastercard|American\s+Express|Amex)\b/gi, 'secure electronic payment transaction'],
  [/\b(?:FedEx|DHL|UPS)\b/gi, 'express logistics courier parcel shipping'],
  [/\b(?:Airbnb|Uber|Lyft)\b/gi, 'rideshare and hospitality travel booking'],
  [/\b(?:Amazon|eBay|AliExpress|Alibaba|Walmart)\b/gi, 'e-commerce online shopping store'],
  [/\b(?:Spotify|Apple\s+Music|SoundCloud)\b/gi, 'digital music audio streaming platform'],
  [/\b(?:GitHub|GitLab|Bitbucket)\b/gi, 'software code repository portal'],
];

// Flat list of all trademark tokens (lowercased) for keyword blacklist removal
const TRADEMARK_KEYWORD_BLACKLIST: Set<string> = new Set([
  // Agencies / Stock Sites
  'adobe', 'shutterstock', 'freepik', 'istock', 'istockphoto', 'getty', 'gettyimages',
  'canva', 'envato', 'vecteezy', 'depositphotos', 'dreamstime', 'alamy', 'pond5', '123rf',
  // Tech Giants
  'apple', 'iphone', 'iphones', 'ipad', 'ipads', 'macbook', 'macos', 'ios', 'airpods',
  'applewatch', 'imac', 'ipod', 'microsoft', 'windows', 'xbox', 'office', 'azure', 'word',
  'excel', 'powerpoint', 'google', 'android', 'chrome', 'gmail', 'youtube', 'googledrive',
  'googlemaps', 'pixel', 'samsung', 'galaxy', 'sony', 'playstation', 'xperia', 'ps4', 'ps5',
  'lg', 'xiaomi', 'huawei', 'dell', 'hp', 'lenovo', 'thinkpad', 'intel', 'amd', 'ryzen',
  'nvidia', 'geforce', 'rtx', 'canon', 'nikon', 'sonyalpha', 'gopro', 'fujifilm', 'leica',
  'nintendo', 'switch', 'meta', 'facebook', 'instagram', 'whatsapp', 'oculus', 'quest',
  'tiktok', 'snapchat', 'discord', 'telegram', 'zoom', 'spotify', 'dropbox', 'onedrive',
  // Software & AI
  'photoshop', 'illustrator', 'premiere', 'aftereffects', 'indesign', 'acrobat', 'creativecloud',
  'midjourney', 'stablediffusion', 'dalle', 'flux', 'chatgpt', 'openai', 'claude', 'gemini', 'mistral',
  // Apparel & Footwear
  'nike', 'jordan', 'airjordan', 'swoosh', 'adidas', 'yeezy', 'puma', 'reebok', 'underarmour',
  'newbalance', 'converse', 'allstar', 'vans', 'fila', 'asics',
  // Luxury & Fashion
  'gucci', 'prada', 'chanel', 'dior', 'louisvuitton', 'versace', 'armani', 'balenciaga',
  'burberry', 'hermes', 'ysl', 'fendi', 'rolex', 'cartier', 'omega', 'rayban',
  // Food & Beverages
  'cocacola', 'coca-cola', 'coke', 'pepsi', 'sprite', 'fanta', 'redbull', 'starbucks',
  'mcdonalds', 'mcdonald', 'kfc', 'burgerking', 'subway', 'pizzahut', 'dominos', 'nestle',
  'kitkat', 'oreo', 'nutella', 'ferrero', 'snickers', 'm&m',
  // Automotive
  'toyota', 'honda', 'nissan', 'mazda', 'mitsubishi', 'bmw', 'mercedes', 'mercedes-benz',
  'mercedesbenz', 'audi', 'porsche', 'ferrari', 'lamborghini', 'tesla', 'cybertruck', 'ford',
  'chevrolet', 'chevy', 'volkswagen', 'vw', 'volvo', 'hyundai', 'kia', 'jeep', 'landrover',
  'rangerover', 'bugatti', 'mclaren',
  // Toys, Games & Characters
  'lego', 'legos', 'barbie', 'hotwheels', 'pokemon', 'pokémon', 'pikachu', 'charizard',
  'disney', 'pixar', 'marvel', 'dc', 'warnerbros', 'harrypotter', 'hogwarts', 'starwars',
  'darthvader', 'jedi', 'superman', 'batman', 'spiderman', 'spider-man', 'ironman', 'hulk',
  'avengers', 'transformers', 'jurassicpark', 'minions', 'minion', 'hellokitty', 'sonic',
  'minecraft', 'fortnite', 'roblox', 'pubg', 'callofduty', 'gta', 'fifa', 'uefa', 'nba',
  'nfl', 'mlb', 'formula1', 'f1', 'wimbledon', 'olympics',
  // Media & Payment
  'netflix', 'hulu', 'hbo', 'primevideo', 'paypal', 'visa', 'mastercard', 'amex', 'americanexpress',
  'fedex', 'dhl', 'ups', 'airbnb', 'uber', 'lyft', 'linkedin', 'reddit', 'pinterest', 'twitter',
  'twitch', 'github', 'gitlab', 'amazon', 'ebay', 'walmart'
]);

/**
 * Sanitize plain text (Prompt, Title, Description) by replacing all registered
 * trademark and copyrighted brands with stock-safe commercial generic terms.
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let result = text;

  // Apply all known trademark replacements
  for (const [pattern, genericReplacement] of TRADEMARK_REPLACEMENTS) {
    result = result.replace(pattern, genericReplacement);
  }

  // Remove duplicate spaces and awkward punctuation artifacts
  result = result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])\1+/g, '$1')
    .trim();

  return result;
}

/**
 * Sanitize keywords array by removing any keyword that contains or matches a trademark or brand.
 */
export function sanitizeKeywords(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) return [];

  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const rawKw of keywords) {
    if (!rawKw || typeof rawKw !== 'string') continue;
    let kw = rawKw.trim();

    // Check if the keyword itself is or contains a blacklisted trademark
    const kwNormalized = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
    let isBlacklisted = false;

    // Direct match against normalized tokens
    if (TRADEMARK_KEYWORD_BLACKLIST.has(kwNormalized)) {
      isBlacklisted = true;
    } else {
      // Check if any blacklisted word appears as a subword or separated word
      for (const forbidden of TRADEMARK_KEYWORD_BLACKLIST) {
        if (forbidden.length >= 3 && kwNormalized === forbidden) {
          isBlacklisted = true;
          break;
        }
        const wordRegex = new RegExp(`\\b${forbidden}\\b`, 'i');
        if (wordRegex.test(kw)) {
          isBlacklisted = true;
          break;
        }
      }
    }

    if (!isBlacklisted) {
      // Further sanitize any generic references in the phrase
      const sanitizedPhrase = sanitizeText(kw).toLowerCase().trim();
      if (sanitizedPhrase && !seen.has(sanitizedPhrase) && sanitizedPhrase.length > 1) {
        seen.add(sanitizedPhrase);
        cleaned.push(sanitizedPhrase);
      }
    }
  }

  return cleaned;
}

/**
 * Complete object sanitizer for AI generation results.
 * Guarantees that neither prompts nor metadata contain copyrighted/trademarked terms.
 */
export function sanitizeAiResult<T extends { prompt?: string; metadata?: any; analysis?: any }>(result: T): T {
  if (!result) return result;

  // Sanitize Prompt
  if (result.prompt) {
    result.prompt = sanitizeText(result.prompt);
  }

  // Sanitize Metadata
  if (result.metadata) {
    if (result.metadata.title) {
      result.metadata.title = sanitizeText(result.metadata.title);
    }
    if (result.metadata.description) {
      result.metadata.description = sanitizeText(result.metadata.description);
    }
    if (Array.isArray(result.metadata.keywords)) {
      result.metadata.keywords = sanitizeKeywords(result.metadata.keywords);
    }
  }

  // Sanitize Analysis Subject & Objects
  if (result.analysis) {
    if (result.analysis.main_subject) {
      result.analysis.main_subject = sanitizeText(result.analysis.main_subject);
    }
    if (Array.isArray(result.analysis.objects)) {
      result.analysis.objects = sanitizeKeywords(result.analysis.objects);
    }
  }

  return result;
}
