import React, { useEffect, useState } from "react";
import { Page, Card, Text, BlockStack, InlineGrid } from "@shopify/polaris";
import { LineChart } from "@shopify/polaris-viz";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState([]);

  async function loadAnalytics() {
    try {
      const res = await fetch("/api/sticky/daily");
      const json = await res.json();

      setDaily(
        json.map((row) => ({
          name: "ATC Events",
          data: [{ x: row.date, y: row.count }],
        }))
      );
    } catch (err) {
      console.error("Failed to load analytics", err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <Page title="Sticky Bar Analytics">
      <BlockStack gap="400">
        <Card>
          <Text variant="headingMd">Daily Add-To-Cart Events</Text>

          {loading ? (
            <Text>Loading…</Text>
          ) : (
            <LineChart
              data={daily}
              xAxisOptions={{ labelFormatter: (value) => value }}
              yAxisOptions={{ integersOnly: true }}
              theme="Light"
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
