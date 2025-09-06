
1. 获取数据库

/get_databases

req:
```
{"connectionId":"962c3693-87b6-4cc5-bd1d-66a6c330fd33"}
```

resp
```
[
    "ai_xiaozhi",
    "aiflowy",
    "eladmin",
    "information_schema",
    "litemall",
    "mysql",
    "performance_schema",
    "personal_hub",
    "ruoyi-vue-pro",
    "ry",
    "ry_blog",
    "sys",
    "virtrem"
]
```

2. 获取数据库表

/get_database_structure

req
```
{"connectionId":"962c3693-87b6-4cc5-bd1d-66a6c330fd33"}
```

```
{
    "connection_id": "962c3693-87b6-4cc5-bd1d-66a6c330fd33",
    "db_type": "MySQL",
    "databases": [
        {
            "name": "ai_xiaozhi",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "aiflowy",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "eladmin",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "information_schema",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "litemall",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "mysql",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "performance_schema",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "personal_hub",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "ruoyi-vue-pro",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "ry",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "ry_blog",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "sys",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        },
        {
            "name": "virtrem",
            "size_info": {
                "bytes": 921600,
                "formatted": "900KB"
            },
            "tables": [
                {
                    "name": "ai_xiaozhi",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "aiflowy",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "eladmin",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "litemall",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "personal_hub",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ruoyi-vue-pro",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "ry_blog",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                },
                {
                    "name": "virtrem",
                    "size_info": {
                        "bytes": 51200,
                        "formatted": "50KB"
                    },
                    "row_count": null,
                    "table_type": "Table"
                }
            ],
            "views": [],
            "procedures": [],
            "functions": [],
            "redis_keys": null,
            "mongodb_collections": null
        }
    ],
    "connection_info": {
        "host": "localhost",
        "port": 3306,
        "username": "root",
        "database_name": null,
        "server_version": null
    }
}
```