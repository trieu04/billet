import { DefaultNamingStrategy } from 'typeorm'
import { snakeCase } from 'typeorm/util/StringUtils'

export class SnakeNamingStrategy extends DefaultNamingStrategy {
  override columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return snakeCase([...embeddedPrefixes, customName ?? propertyName].join('_'))
  }

  override relationName(propertyName: string): string {
    return snakeCase(propertyName)
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`)
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`)
  }
}

export const snakeNamingStrategy = new SnakeNamingStrategy()
