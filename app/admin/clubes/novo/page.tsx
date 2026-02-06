import CRUDClub from "@/components/Atoms/CRUDClub";

export default function NovoClubePage() {
  return (
    <CRUDClub
      mode="create"
      initial={{
        nome: "",
        logoUrl: "",
        countryCode: "BR",
        countryName: "Brasil",
        continentCode: "SA",
        stateCode: "",
        stateName: "",
        city: "",
      }}
    />
  );
}
