import type { Schema } from 'effect';
import { Context, Effect, Layer, Option } from 'effect';
import type React from 'react';

import type { Path } from './Path.js';

const NoDefaultValue = Symbol.for('FormField/NoDefaultValue');
type NoDefaultValue = typeof NoDefaultValue;
class FormFieldClass<
  Self,
  A extends React.FC<any>,
  S extends Schema.Schema.AnyNoContext,
> {
  private constructor(
    readonly tag: Context.Tag<Self, FormField.ComponentBuilder<A>>,
    readonly schema: S,
    private readonly defaultValue: S['Encoded'] | NoDefaultValue,
  ) {}

  static withDefaultValue = <
    Self,
    A extends React.FC<any>,
    S extends Schema.Schema.AnyNoContext,
  >(
    tag: Context.Tag<Self, FormField.ComponentBuilder<A>>,
    schema: S,
    defaultValue: S['Encoded'] | NoDefaultValue,
  ) => new FormFieldClass<Self, A, S>(tag, schema, defaultValue);

  static withoutDefaultValue = <
    Self,
    A extends React.FC<any>,
    S extends Schema.Schema.AnyNoContext,
  >(
    tag: Context.Tag<Self, FormField.ComponentBuilder<A>>,
    schema: S,
  ) => new FormFieldClass<Self, A, S>(tag, schema, NoDefaultValue);

  decorate<A_ extends A>(): FormFieldClass<Self, A_, S> {
    //@ts-expect-error "casting this to another ReactFC type"
    return this;
  }

  getDefaultValue(): Option.Option<S['Encoded']> {
    return Option.liftPredicate(
      this.defaultValue,
      value => value !== NoDefaultValue,
    );
  }

  matchDefaultValue({
    withDefaultValue,
    withoutDefaultValue,
  }: {
    withDefaultValue: (value: S['Encoded']) => void;
    withoutDefaultValue?: () => void;
  }): void {
    if (this.defaultValue === NoDefaultValue) {
      withoutDefaultValue?.();
    } else {
      withDefaultValue(this.defaultValue);
    }
  }
}

export declare namespace FormField {
  export interface ComponentBuilder<A extends React.FC<any>> {
    (_: { path: Path }): A;
  }

  export type OfProps<T> = FormFieldClass<
    any,
    React.FC<T>,
    Schema.Schema.AnyNoContext
  >;

  export type Any = FormFieldClass<
    any,
    React.FC<any>,
    Schema.Schema.AnyNoContext
  >;
}

export const FormField =
  <const Id extends string>(id: Id) =>
  <
    Self,
    A extends React.FC<any> = React.FC<any>,
    S_ extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  >() => {
    const tag = Context.Tag<Id>(id)<Self, FormField.ComponentBuilder<A>>();
    return Object.assign(tag, {
      make: <S extends S_>(props: {
        schema: S;
        defaultValue: S['Encoded'];
      }): FormFieldClass<Self, A, S> =>
        FormFieldClass.withDefaultValue(tag, props.schema, props.defaultValue),
      makeRequired: <S extends S_>(props: {
        schema: S;
      }): FormFieldClass<Self, A, S> =>
        FormFieldClass.withoutDefaultValue<Self, A, S>(
          tag,
          // @ts-expect-error "schema.annotations looses the type"
          props.schema.annotations({
            message: () => ({
              message: 'This field is required',
              override: true,
            }),
          }),
        ),
      layerBuilder: <E, R>(
        component:
          | FormField.ComponentBuilder<A>
          | Effect.Effect<FormField.ComponentBuilder<A>, E, R>,
      ): Layer.Layer<Self, E, R> => {
        if (Effect.isEffect(component)) {
          return Layer.effect(tag, component);
        }
        return Layer.succeed(tag, component);
      },
    });
  };