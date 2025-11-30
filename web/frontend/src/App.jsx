import React from "react";
import { AppProvider, Page, Layout, Card, Text } from "@shopify/polaris";

export default function App() {
  return (
    <AppProvider
      i18n={{
        Polaris: {
          ResourceList: {
            sortingLabel: "Sort by",
            defaultItemSingular: "item",
            defaultItemPlural: "items",
            showing: "Showing {itemsCount} {itemsCount, plural, one {item} other {items}}"
          },
          Common: {
            checkbox: "checkbox"
          }
        }
      }}
    >
      <Page title="Sticky Add-to-Cart Bar Pro">
        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <Text as="h2" variant="headingMd">
                  Welcome to your app admin
                </Text>
                <Text as="p" variant="bodyMd">
                  This is the Polaris-powered admin UI for BDM Sticky Add-to-Cart Bar Pro.
                  You can now build out analytics, settings, and more here.
                </Text>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
