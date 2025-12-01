// web/frontend/src/navigation.jsx
import { Navigation } from "@shopify/polaris";
import { HomeIcon } from "@shopify/polaris-icons";

export default function AppNavigation() {
  return (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            label: "Dashboard",
            icon: HomeIcon,
            url: "/",
          },
          {
            label: "Analytics",
            icon: HomeIcon, // placeholder
            url: "/analytics",
          },
        ]}
      />
    </Navigation>
  );
}
