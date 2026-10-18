// Edit the shared questions and your profile here. Use a public image path for photo.src.
export const profileFields = [
  { id: "name", label: "Name", placeholder: "Dein Name" },
  { id: "age", label: "Alter", placeholder: "Dein Alter", type: "number" },
  { id: "birthplace", label: "Geburtsort", placeholder: "Dein Geburtsort" },
  { id: "studies", label: "Studium", placeholder: "Dein Studium" },
  { id: "eyes", label: "Augenfarbe", placeholder: "Deine Augenfarbe" },
];
export const questions = [
  {
    id: "question-1", title: "Was ist dein bestes Party-Outfit?",
    answer: "Bademantel, aber mit Schwimmkappe.",
  },
  {
    id: "question-2", title: "Was würdest du deinem 10-jährigen Ich sagen?",
    answer: "Es wird viel geiler!",
  },
  {
    id: "question-3", title: "Was möchtest du im nächsten Jahr schaffen?",
    answer: "Psychologische Forschung in die Anwendung bringen.",
  },
  {
    id: "question-4", title: "Was ist dein Lieblingsmotorrad?",
    answer: "Yamaha XSR 700.",
  },
];
export const myProfile = {
  name: "Tyson Heinzinger", age: "23 Jahre", birthplace: "Wiesbaden",
  studies: "Psychologie", eyes: "Blau",
};
export const photo = { src: "/images/tyson.jpeg", alt: "Profilbild von Tyson Heinzinger" };
