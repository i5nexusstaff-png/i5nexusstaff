import { useState } from 'react';
import { Quote } from 'lucide-react';

const QUOTES = [
  "Every plot you sell is a family's dream fulfilled. Keep going!",
  "Success in real estate is not about luck — it's about daily effort.",
  "Your next client is just one conversation away.",
  "The best investment you can make is in yourself and your team.",
  "Champions don't stop when they're tired. They stop when they're done.",
  "Every 'no' brings you one step closer to a 'yes'.",
  "Your attitude determines your direction. Stay positive!",
  "Great things never come from comfort zones. Push harder today!",
  "The secret of getting ahead is getting started.",
  "You are one deal away from changing everything.",
  "Real estate is not just about property — it's about people's futures.",
  "Success is the sum of small efforts repeated day after day.",
  "Don't count the days — make the days count!",
  "A winner is just a loser who tried one more time.",
  "Your hard work today is tomorrow's success story.",
  "Dream big, work hard, stay focused. The best is yet to come!",
  "Every client you help is a legacy you build.",
  "The harder you work, the luckier you get.",
  "Stars can't shine without darkness. Keep pushing through!",
  "Today's efforts are tomorrow's achievements.",
];

export default function MotivationalQuote({ name }) {
  // Truly random quote — picks a new one every time the component mounts (every login)
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const firstName = name?.split(' ')[0] || 'there';

  return (
    <div className="relative overflow-hidden rounded-2xl mb-6"
      style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #1e4d8c 50%, #f26522 150%)' }}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full translate-y-8 -translate-x-8" />
      <div className="relative px-6 py-5 flex items-start gap-4">
        <Quote size={28} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-bold text-base leading-snug">"{quote}"</p>
          <p className="text-blue-300 text-sm mt-2">Good {getTimeOfDay()}, <span className="text-accent font-semibold">{firstName}</span>! Let's make today count. 🚀</p>
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
