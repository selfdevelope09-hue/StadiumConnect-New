import { ScrollView, View } from 'react-native';
import { Card, List, Text } from 'react-native-paper';

type Props = {
  title: string;
  sourceHtml: string;
  /** Optional: React Navigation screen key for the checklist */
  routeName?: string;
};

export function MigratedContent({ title, sourceHtml, routeName }: Props) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Card mode="outlined" style={{ marginBottom: 16 }}>
        <Card.Title title="StadiumConnect (React Native)" />
        <Card.Content>
          <Text variant="bodyLarge">
            Port of <Text style={{ fontWeight: '700' }}>{sourceHtml}</Text> (
            {title}). Replace with native components and the same Firestore
            contract as the web `firebase-config.js` helpers.
          </Text>
        </Card.Content>
      </Card>
      <List.Section>
        <List.Subheader>Source</List.Subheader>
        {routeName ? <List.Item title="Route" description={routeName} /> : null}
        <List.Item title="Original HTML" description={sourceHtml} />
      </List.Section>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
