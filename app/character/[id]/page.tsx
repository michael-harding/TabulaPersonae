import CharacterSheetPage from "./character-page"

export default function Page({ params }: { params: { id: string } }) {
  // Use params.id to load your character
  return <CharacterSheetPage id={params.id} />
}

