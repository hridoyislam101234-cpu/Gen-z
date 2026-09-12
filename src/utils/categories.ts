export interface StockCategory {
  id: number;
  name: string;
  description: string;
}

export const STOCK_CATEGORIES: StockCategory[] = [
  { id: 1, name: 'Animals', description: 'Domestic pets, wildlife, insects, marine creatures' },
  { id: 2, name: 'Buildings and Architecture', description: 'Modern towers, homes, historical structures, interiors' },
  { id: 3, name: 'Business', description: 'Offices, corporate teams, finances, startups, documents' },
  { id: 4, name: 'Drinks', description: 'Coffee, tea, cocktails, beverages, glasses, bar scenes' },
  { id: 5, name: 'The Environment', description: 'Conservation, renewable energy, climate, recycling' },
  { id: 6, name: 'States of Mind', description: 'Emotions, zen meditation, stress, joy, focus' },
  { id: 7, name: 'Food', description: 'Dishes, fruits, vegetables, bakery, dining, cooking' },
  { id: 8, name: 'Graphic Resources', description: 'Illustrations, vectors, icons, Halloween/holiday themes, silhouettes, backgrounds' },
  { id: 9, name: 'Hobbies and Leisure', description: 'Crafts, gaming, reading, collecting, music, relaxing' },
  { id: 10, name: 'Industry', description: 'Factories, heavy engineering, manufacturing, construction' },
  { id: 11, name: 'Landscapes', description: 'Mountains, oceans, deserts, forests, sunrises, scenery' },
  { id: 12, name: 'Lifestyle', description: 'Daily habits, wellness, modern living, home life' },
  { id: 13, name: 'People', description: 'Portraits, families, diverse age groups, candid expressions' },
  { id: 14, name: 'Plants and Flowers', description: 'Floral close-ups, trees, botanical gardens, leaves' },
  { id: 15, name: 'Culture and Religion', description: 'Traditional festivals, heritage, temples, historical arts' },
  { id: 16, name: 'Science', description: 'Laboratories, chemistry, medical research, astronomy' },
  { id: 17, name: 'Social Issues', description: 'Community support, volunteering, equality, modern society' },
  { id: 18, name: 'Sports', description: 'Athletics, fitness, soccer, swimming, extreme sports' },
  { id: 19, name: 'Technology', description: 'Gadgets, artificial intelligence, robotics, cyber networks' },
  { id: 20, name: 'Transport', description: 'Vehicles, airplanes, trains, roads, electric mobility' },
  { id: 21, name: 'Travel', description: 'Destinations, luggage, aviation, sightseeing, vacations' },
];

export function getCategoryById(id: number): StockCategory | undefined {
  return STOCK_CATEGORIES.find((cat) => cat.id === id);
}
