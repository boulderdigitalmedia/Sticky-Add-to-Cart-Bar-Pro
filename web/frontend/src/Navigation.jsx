import { Navigation } from "@shopify/polaris";
import {
  HomeIcon,
  ChartBarIcon,
} from "@shopify/polaris-icons";

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
            icon: ChartBarIcon,
            url: "/analytics",
          },
        ]}
      />
    </Navigation>
  );
}
