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
            // reuse HomeIcon for now; you can swap to another valid icon later
            icon: HomeIcon,
            url: "/analytics",
          },
        ]}
      />
    </Navigation>
  );
}
