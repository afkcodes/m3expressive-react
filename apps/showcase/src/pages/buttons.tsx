import { Button } from '@m3x/react';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const VARIANTS = ['filled', 'tonal', 'outlined', 'elevated', 'text'] as const;
const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

export default function ButtonsPage() {
  return (
    <Page
      title="Buttons"
      summary="Buttons prompt most actions in a UI. Five colour styles, five sizes, round or square — and a press morph that springs the corners in."
    >
      <Section title="Variants" description="From highest to lowest emphasis.">
        <Demo
          wide
          code={`
<Button variant="filled">Filled</Button>
<Button variant="tonal">Tonal</Button>
<Button variant="outlined">Outlined</Button>
<Button variant="elevated">Elevated</Button>
<Button variant="text">Text</Button>`}
        >
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v[0]!.toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </Demo>
        <Demo title="With an icon" code={`<Button icon={<Icon name="add" />}>Create</Button>`}>
          <Button icon={<Icon name="add" size={20} />}>Create</Button>
          <Button variant="tonal" icon={<Icon name="send" size={20} />}>
            Send
          </Button>
          <Button variant="outlined" icon={<Icon name="download" size={20} />}>
            Export
          </Button>
        </Demo>
        <Demo title="Disabled" code={`<Button disabled>Filled</Button>`}>
          {VARIANTS.map((v) => (
            <Button key={v} variant={v} disabled>
              {v[0]!.toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </Demo>
      </Section>

      <Section title="Sizes" description="Extra small to extra large. Press and hold to see the shape morph.">
        <Demo
          wide
          code={`
<Button size="xsmall">Extra small</Button>
<Button size="small">Small</Button>
<Button size="medium">Medium</Button>
<Button size="large">Large</Button>
<Button size="xlarge">Extra large</Button>`}
        >
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              {size === 'xsmall'
                ? 'Extra small'
                : size === 'xlarge'
                  ? 'Extra large'
                  : size[0]!.toUpperCase() + size.slice(1)}
            </Button>
          ))}
        </Demo>
      </Section>

      <Section title="Shape" description="Round (default) or square corners; both morph on press.">
        <Demo code={`<Button shape="square">Square</Button>`}>
          <Button shape="round">Round</Button>
          <Button shape="square">Square</Button>
          <Button shape="square" variant="tonal">
            Square tonal
          </Button>
        </Demo>
      </Section>
    </Page>
  );
}
